import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmpresaDashboard from './pages/EmpresaDashboard';
import Formularios from './pages/Formularios';
import EnvioAvaliacoes from './pages/EnvioAvaliacoes';
import EvaluationDetails from './pages/EvaluationDetails';
import EvaluationCompany from './pages/EvaluationCompany';
import ActionPlanCompany from './pages/ActionPlanCompany';
import ActionPlanAnswerForm from './components/action_plan/ActionPlanAnswerForm';
import ActionPlanView from './components/action_plan/ActionPlanView';
import CompanyAnswer from './components/CompanyAnswer';
import ViewActionPlan from './components/action_plan/ViewActionPlan';
import CreateActionPlan from './components/action_plan/CreateActionPlan';
import { AdminRoute, EmpresaRoute, PrivateRoute } from './components/PrivateRoute';
import { ThemeProvider } from './context/ThemeContext';

const App = () => {
  const companyId = localStorage.getItem("companyId");
  return (
    <ThemeProvider>
      <Routes>
        {/* Rota de Login */}
        <Route path="/login" element={<Login />} />

        {/* Rotas para Administrador */}
        <Route
          path="/admin-dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId/view"
          element={
            <AdminRoute>
              <ViewActionPlan />
            </AdminRoute>
          }
        />
        <Route
          path="/action-plan/:evaluationId/create"
          element={
            <AdminRoute>
              <CreateActionPlan />
            </AdminRoute>
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
          path="/formularios"
          element={
            <AdminRoute>
              <Formularios />
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

        {/* Rotas para Empresa */}
        <Route
          path="/empresa-dashboard"
          element={
            <EmpresaRoute>
              <EmpresaDashboard />
            </EmpresaRoute>
          }
        />
        <Route
          path="/empresa-avaliacao"
          element={
            <EmpresaRoute>
              <EvaluationCompany companyId={companyId} />
            </EmpresaRoute>
          }
        />
        <Route
          path="/empresa-plano-acao"
          element={
            <EmpresaRoute>
              <ActionPlanCompany />
            </EmpresaRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId/answer"
          element={
            <EmpresaRoute>
              <ActionPlanAnswerForm />
            </EmpresaRoute>
          }
        />
        <Route
          path="/evaluation/:id/answer"
          element={
            <EmpresaRoute>
              <CompanyAnswer />
            </EmpresaRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId"
          element={
            <EmpresaRoute>
              <ActionPlanView />
            </EmpresaRoute>
          }
        />
        {/* Rota padrão - Redirecionamento baseado na autenticação */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Navigate to="/login" replace />
            </PrivateRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
