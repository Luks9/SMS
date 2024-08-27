import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'));

    if (savedUser && token) {
      setUser(savedUser);
      verifyAndRefreshToken(); // Verifica e renova o token se necessário
    }
  }, []); // O array vazio garante que o efeito seja executado apenas uma vez

  const verifyAndRefreshToken = async () => {
    try {
      const response = await axios.post('/api/users/token/refresh/');
      const newAccessToken = response.data.access; // Novo token de acesso

      if (newAccessToken) {
        setToken(newAccessToken);
        localStorage.setItem('token', newAccessToken); // Armazena o novo token
      } else {
        logout();
      }
    } catch (error) {
      console.error('Erro ao renovar o token:', error);
      logout(); // Se ocorrer erro, faça logout
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/users/login/', { username, password });
      const loggedUser = response.data.user;
      const accessToken = response.data.token;

      setUser(loggedUser);
      setToken(accessToken);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      localStorage.setItem('token', accessToken);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login falhou', error);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Função para obter o token de forma segura
  const getToken = () => token;

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider as default };
