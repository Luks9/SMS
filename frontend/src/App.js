import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmpresaDashboard from './pages/EmpresaDashboard';
import Formularios from './pages/Formularios';
import EnvioAvaliacoes from './pages/EnvioAvaliacoes';
import EvaluationDetails from './pages/EvaluationDetails';
import { AdminRoute, EmpresaRoute, PrivateRoute } from './components/PrivateRoute';
import { ThemeProvider } from './context/ThemeContext';

const App = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotas para administrador */}
        <Route
          path="/admin-dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Rotas para empresa */}
        <Route
          path="/empresa-dashboard"
          element={
            <EmpresaRoute>
              <EmpresaDashboard />
            </EmpresaRoute>
          }
        />

        <Route
          path="/enviar-avaliacao"
          element={
            <AdminRoute>
              <EnvioAvaliacoes />
            </AdminRoute>
          }
        />
        <Route 
          path="/evaluation/:id/details" 
          element={
            <AdminRoute>
              <EvaluationDetails />
            </AdminRoute>
          } 
        />

        <Route
          path="/formularios"
          element={
            <AdminRoute>
              <Formularios />
            </AdminRoute>
          }
        />

        {/* Rota de redirecionamento padrão */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Navigate to="/dashboard" replace />
            </PrivateRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
