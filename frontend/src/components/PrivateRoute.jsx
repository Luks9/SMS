import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  if (!user || localStorage.getItem('userType') !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const EmpresaRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  if (!user || localStorage.getItem('userType') !== 'empresa') {
    return <Navigate to="/login" replace />;
  }

  return children;
};
