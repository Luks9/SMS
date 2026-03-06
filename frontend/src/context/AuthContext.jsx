import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMsal } from '@azure/msal-react';
import usePoleContext from './usePoles';

const AuthContext = createContext();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
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

  const parseStoredCompany = useCallback((rawValue) => {
    if (!rawValue) return null;
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn('selectedCompany invalida no storage, limpando valor.', error);
      localStorage.removeItem('selectedCompany');
      return null;
    }
  }, []);

  const isCompanyAllowedForUser = useCallback((company, authUser) => {
    if (!company || !authUser || authUser.is_superuser) return false;
    return (authUser.companies || []).some((item) => String(item.id) === String(company.id));
  }, []);

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
    const savedCompany = parseStoredCompany(localStorage.getItem('selectedCompany'));

    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      
      // Se há uma empresa salva, configure-a
      if (savedCompany && isCompanyAllowedForUser(savedCompany, savedUser)) {
        setSelectedCompany(savedCompany);
        localStorage.setItem('companyId', savedCompany.id);
      } else if (!savedUser.is_superuser) {
        localStorage.removeItem('selectedCompany');
        localStorage.removeItem('companyId');
      }
      
      axios.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
      loadUserPoles(savedToken, savedUser);
    }

    setIsLoading(false);
  }, [isCompanyAllowedForUser, loadUserPoles, parseStoredCompany]);

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

  const clearSession = useCallback(() => {
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
    localStorage.removeItem('is_staff');

    delete axios.defaults.headers.common.Authorization;
  }, [setActivePole, setPoles]);

  const logout = useCallback(() => {
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

  const logoutWithMsal = useCallback(async () => {
    // Evita auto-login imediato no retorno para /login durante fluxo de logout.
    sessionStorage.setItem('msal_logout_in_progress', '1');
    clearSession();

    try {
      const account = instance.getActiveAccount?.() || accounts?.[0] || null;
      await instance.logoutRedirect({
        account,
        postLogoutRedirectUri: `${window.location.origin}/login`,
      });
    } catch (error) {
      console.warn('Logout MSAL falhou:', error);
      // Fallback local quando logout federado falha.
      navigate('/login');
    }
  }, [accounts, clearSession, instance, navigate]);

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
            // Evita loop infinito de login/logout em 401 de regra de negócio.
            // Se já houve retry com token renovado e ainda falhou, apenas propaga erro.
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

  const handleCompanySelection = useCallback((company, baseUser = user) => {
    if (!company || !baseUser) {
      return;
    }

    setSelectedCompany(company);
    setShowCompanySelection(false);
    
    // Salvar empresa selecionada
    localStorage.setItem('selectedCompany', JSON.stringify(company));
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('userType', 'empresa');
    
    // Atualizar o usuário com a empresa selecionada para compatibilidade
    const updatedUser = { ...baseUser, company: company };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    navigate('/empresa-dashboard');
  }, [user, navigate]);

  const login = useCallback(
    async (accessToken) => {
      try {
        let response = null;
        const maxAttempts = 2;
        const loginEndpoints = ['/api/users/login/', '/api/users/login'];
        let lastError = null;

        for (const endpoint of loginEndpoints) {
          for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
              response = await axios.post(endpoint, null, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              break;
            } catch (err) {
              lastError = err;
              const status = err?.response?.status;
              const isNotFound = status === 404;
              const isTransient = !status || status >= 500 || status === 429;
              const shouldRetrySameEndpoint = attempt < maxAttempts && isTransient;

              if (shouldRetrySameEndpoint) {
                await wait(400 * attempt);
                continue;
              }

              // Se for 404, tenta variacao do endpoint (com/sem barra final).
              if (isNotFound) {
                break;
              }

              throw err;
            }
          }

          if (response) break;
        }

        if (!response) {
          throw lastError || new Error('Falha ao chamar endpoint de login.');
        }

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
        const apiDetail = error?.response?.data?.detail;
        if (apiDetail) {
          setMessage(apiDetail);
        } else {
          setMessage('Nao foi possivel concluir o login. Verifique sua conta corporativa e se sua empresa/grupo esta configurado no sistema.');
        }
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
        logoutWithMsal,
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
