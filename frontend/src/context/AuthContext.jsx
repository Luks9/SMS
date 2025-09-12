import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true); // Adiciona estado de carregamento
  const [message, setMessage] = useState(null); // Estado para mensagens de status

  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'));
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      // Não chama verifyAndRefreshToken no carregamento inicial para evitar logout desnecessário
    }
    setIsLoading(false);
  }, []); 

  const verifyAndRefreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return;
      }

      const response = await axios.post('/api/users/token/refresh/', {
        refresh: refreshToken
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
  };

 const login = async (accessToken) => {
    try {
      const response = await axios.post('/api/users/login/',  null, { 
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const loggedUser = response.data.user;
      const token = response.data.token;
      const refreshToken = response.data.refresh; // Armazena também o refresh token

      setUser(loggedUser);
      setToken(token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      setMessage('Login realizado com sucesso!');
      
      // Verifica o tipo de usuário e salva no localStorage
      if (loggedUser.company === null) {
        localStorage.setItem('userType', 'admin');
        navigate('/admin-dashboard');
      } else {
        localStorage.setItem('userType', 'empresa');
        localStorage.setItem('companyId', loggedUser.company.id);
        navigate('/empresa-dashboard');
      }
    } catch (error) {
      console.error('Login falhou', error);
      setMessage('Falha no login. Verifique suas credenciais.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('companyId');
    navigate('/login');
  };

  // Função para obter o token de forma segura
  const getToken = () => token;

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken, isLoading, message, setMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider as default };
