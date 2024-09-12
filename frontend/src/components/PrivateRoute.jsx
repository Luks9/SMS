import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Carregando...</div>; // Exibe um indicador de carregamento
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AdminRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!user || localStorage.getItem('userType') !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const EmpresaRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!user || localStorage.getItem('userType') !== 'empresa') {
    return <Navigate to="/login" replace />;
  }

  return children;
};
