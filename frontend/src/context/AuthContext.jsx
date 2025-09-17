import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
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

    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
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

  const verifyAndRefreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return;
      }

      const response = await axios.post('/api/users/token/refresh/', {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;

      if (newAccessToken) {
        setToken(newAccessToken);
        localStorage.setItem('token', newAccessToken);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Erro ao renovar o token:', error);
      logout();
    }
  }, []);

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

        setMessage('Login realizado com sucesso!');

        if (loggedUser.is_superuser) {
          localStorage.setItem('userType', 'admin');
          localStorage.removeItem('companyId');
          await loadUserPoles(tokenResponse, loggedUser);
          navigate('/admin-dashboard');
        } else if (loggedUser.company) {
          localStorage.setItem('userType', 'empresa');
          localStorage.setItem('companyId', loggedUser.company.id);
          setPoles([]);
          setActivePole(null);
          navigate('/empresa-dashboard');
        } else {
          localStorage.setItem('userType', 'empresa');
          localStorage.removeItem('companyId');
          setPoles([]);
          setActivePole(null);
          navigate('/empresa-dashboard');
        }
      } catch (error) {
        console.error('Login falhou', error);
        setMessage('Falha no login. Verifique suas credenciais.');
      }
    },
    [loadUserPoles, navigate, setActivePole, setPoles]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPoles([]);
    setActivePole(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('companyId');
    navigate('/login');
  }, [navigate, setActivePole, setPoles]);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider as default };
