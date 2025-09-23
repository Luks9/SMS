import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import usePoleContext from './usePoles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showCompanySelection, setShowCompanySelection] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const refreshPromiseRef = useRef(null);

  const {
    poles,
    setPoles,
    selectedPole,
    selectedPoleId,
    setActivePole,
    loadUserPoles,
    userRef,
    tokenRef,
  } = usePoleContext({ initialPoleId: null });

  const navigate = useNavigate();

  useEffect(() => {
    userRef.current = user;
  }, [user, userRef]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token, tokenRef]);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem('user');
    const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
    const savedToken = localStorage.getItem('token');
    const savedCompany = localStorage.getItem('selectedCompany');

    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      
      // Se há uma empresa salva, configure-a
      if (savedCompany && !savedUser.is_superuser) {
        const company = JSON.parse(savedCompany);
        setSelectedCompany(company);
      }
      
      axios.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      loadUserPoles(savedToken, savedUser);
    }

    setIsLoading(false);
  }, [loadUserPoles]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [token]);

  useEffect(() => {
    if (user?.is_superuser) {
      loadUserPoles();
    } else if (user && !user.is_superuser) {
      setPoles([]);
      setActivePole(null);
    }
  }, [user?.is_superuser, loadUserPoles, setActivePole, setPoles, user]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPoles([]);
    setActivePole(null);
    setSelectedCompany(null);
    setShowCompanySelection(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('companyId');
    localStorage.removeItem('selectedCompany');
    delete axios.defaults.headers.common.Authorization;
    navigate('/login');
  }, [navigate, setActivePole, setPoles]);

  const verifyAndRefreshToken = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          logout();
          return false;
        }

        const response = await axios.post('/api/users/token/refresh/', {
          refresh: storedRefreshToken,
        });

        const { access: newAccessToken, refresh: rotatedRefreshToken } = response.data || {};

        if (!newAccessToken) {
          logout();
          return false;
        }

        setToken(newAccessToken);
        localStorage.setItem('token', newAccessToken);
        axios.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        if (rotatedRefreshToken) {
          localStorage.setItem('refreshToken', rotatedRefreshToken);
        }

        return true;
      } catch (error) {
        console.error('Erro ao renovar o token:', error);
        logout();
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [logout]);

  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const isAuthRequest = originalRequest?.url?.includes('/api/users/token/refresh/') ||
          originalRequest?.url?.includes('/api/users/login/');

        if (error.response?.status === 401 && originalRequest && !isAuthRequest) {
          if (originalRequest._retry) {
            logout();
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          const refreshed = await verifyAndRefreshToken();

          if (refreshed) {
            const latestToken = localStorage.getItem('token');
            if (latestToken) {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${latestToken}`,
              };
            }
            return axios(originalRequest);
          }

          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout, verifyAndRefreshToken]);

  const handleCompanySelection = useCallback((company) => {
    setSelectedCompany(company);
    setShowCompanySelection(false);
    
    // Salvar empresa selecionada
    localStorage.setItem('selectedCompany', JSON.stringify(company));
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('userType', 'empresa');
    
    // Atualizar o usuário com a empresa selecionada para compatibilidade
    const updatedUser = { ...user, company: company };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    navigate('/empresa-dashboard');
  }, [user, navigate]);

  const login = useCallback(
    async (accessToken) => {
      try {
        const response = await axios.post('/api/users/login/', null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const loggedUser = response.data.user;
        const tokenResponse = response.data.token;
        const refreshToken = response.data.refresh;

        setUser(loggedUser);
        setToken(tokenResponse);
        axios.defaults.headers.common.Authorization = `Bearer ${tokenResponse}`;
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('token', tokenResponse);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        // Adiciona is_staff ao localStorage
        localStorage.setItem('is_staff', loggedUser.is_staff);

        setMessage('Login realizado com sucesso!');

        if (loggedUser.is_superuser) {
          localStorage.setItem('userType', 'admin');
          localStorage.removeItem('companyId');
          localStorage.removeItem('selectedCompany');
          await loadUserPoles(tokenResponse, loggedUser);
          navigate('/admin-dashboard');
        } else if (loggedUser.companies && loggedUser.companies.length > 1) {
          // Usuário tem múltiplas empresas - mostrar modal de seleção
          setShowCompanySelection(true);
        } else if (loggedUser.companies && loggedUser.companies.length === 1) {
          // Usuário tem apenas uma empresa - selecioná-la automaticamente
          const company = loggedUser.companies[0];
          handleCompanySelection(company);
        } else if (loggedUser.company) {
          // Fallback para compatibilidade com estrutura antiga
          localStorage.setItem('userType', 'empresa');
          localStorage.setItem('companyId', loggedUser.company.id);
          setSelectedCompany(loggedUser.company);
          setPoles([]);
          setActivePole(null);
          navigate('/empresa-dashboard');
        } else {
          // Usuário sem empresa associada
          localStorage.setItem('userType', 'empresa');
          localStorage.removeItem('companyId');
          localStorage.removeItem('selectedCompany');
          setPoles([]);
          setActivePole(null);
          navigate('/empresa-dashboard');
        }
      } catch (error) {
        console.error('Login falhou', error);
        setMessage('Falha no login. Verifique suas credenciais.');
      }
    },
    [loadUserPoles, navigate, setActivePole, setPoles, handleCompanySelection]
  );

  const switchCompany = useCallback((company) => {
    handleCompanySelection(company);
  }, [handleCompanySelection]);

  const getToken = () => token;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        getToken,
        isLoading,
        message,
        setMessage,
        verifyAndRefreshToken,
        poles,
        selectedPole,
        selectedPoleId,
        setActivePole,
        refreshPoles: loadUserPoles,
        showCompanySelection,
        setShowCompanySelection,
        selectedCompany,
        handleCompanySelection,
        switchCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider as default };
