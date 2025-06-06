import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute, EmpresaRoute, PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';

// Páginas
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmpresaDashboard from './pages/EmpresaDashboard';
import Formularios from './pages/Formularios';
import EnvioAvaliacoes from './pages/EnvioAvaliacoes';
import EvaluationDetails from './pages/EvaluationDetails';
import EvaluationCompany from './pages/EvaluationCompany';
import ActionPlanCompany from './pages/ActionPlanCompany';
// Componentes de Planos de Ação
import ActionPlanAnswerForm from './components/action_plan/ActionPlanAnswerForm';
import ActionPlanView from './components/action_plan/ActionPlanView';
import ViewActionPlan from './components/action_plan/ViewActionPlan';
import CreateActionPlan from './components/action_plan/CreateActionPlan';
// Outros Componentes
import CompanyAnswer from './components/CompanyAnswer';
import RemCompany from './pages/rem/RemCompany';
import RemForm from './pages/rem/RemForm';
import RemAvaliador from './pages/rem/RemAvaliador';

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
            <ProtectedRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId/view"
          element={
            <ProtectedRoute>
              <AdminRoute>
              <ViewActionPlan />
            </AdminRoute>
            </ProtectedRoute>            
          }
        />
        <Route
          path="/action-plan/:evaluationId/create"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <CreateActionPlan />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/enviar-avaliacao"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <EnvioAvaliacoes />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/formularios"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Formularios />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluation/:id/details"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <EvaluationDetails />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rem-avaliador"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <RemAvaliador />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Rotas para Empresa */}
        <Route
          path="/empresa-dashboard"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <EmpresaDashboard />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa-avaliacao"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <EvaluationCompany companyId={companyId} />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa-plano-acao"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <ActionPlanCompany />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId/answer"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <ActionPlanAnswerForm />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluation/:id/answer"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <CompanyAnswer />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/action-plan/:actionPlanId"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <ActionPlanView />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rem-empresa"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <RemCompany companyId={companyId} />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rem-empresa/novo"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <RemForm companyId={companyId} />
              </EmpresaRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rem-empresa/edite"
          element={
            <ProtectedRoute>
              <EmpresaRoute>
                <RemForm companyId={companyId} />
              </EmpresaRoute>
            </ProtectedRoute>
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
