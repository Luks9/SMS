import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};