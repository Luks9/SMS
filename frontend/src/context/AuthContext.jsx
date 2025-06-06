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

    if (savedUser && token) {
      setUser(savedUser);
      verifyAndRefreshToken().finally(() => setIsLoading(false)); // Finaliza carregamento após verificação
    }else{
      setIsLoading(false); // Finaliza carregamento se não houver usuário ou token

    }
  }, []); 

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

 const login = async (accessToken) => {
    try {
      const response = await axios.post('/api/users/login/',  null, { 
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const loggedUser = response.data.user;
      const token = response.data.token;

      setUser(loggedUser);
      setToken(token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      localStorage.setItem('token', token);

      setMessage('Login realizado com sucesso!'); // Mensagem de sucesso
      
      // Verifica o tipo de usuário e salva no localStorage
      if (loggedUser.company === null) {
        localStorage.setItem('userType', 'admin');
        navigate('/admin-dashboard'); // Redireciona para o dashboard do administrador
      } else {
        localStorage.setItem('userType', 'empresa');
        localStorage.setItem('companyId', loggedUser.company.id);
        navigate('/empresa-dashboard'); // Redireciona para o dashboard da empresa
      }
    } catch (error) {
      console.error('Login falhou', error);
      setMessage('Falha no login. Verifique suas credenciais.'); // Mensagem de erro
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
