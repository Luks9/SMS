import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import moment from 'moment';

const ActionPlanView = () => {
  const { actionPlanId } = useParams(); // Obtém o ID do plano de ação da URL
  const { getToken } = useContext(AuthContext); // Pega o token de autenticação
  const [actionPlan, setActionPlan] = useState(null); // Estado para guardar o plano de ação
  const [loading, setLoading] = useState(true); // Estado de carregamento

  // Função para buscar os detalhes do plano de ação
  const fetchActionPlanDetails = async () => {
    const token = getToken();
    try {
      const response = await axios.get(`/api/action-plan/${actionPlanId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setActionPlan(response.data);
    } catch (error) {
      console.error('Erro ao buscar os dados do plano de ação:', error);
    } finally {
      setLoading(false);
    }
  };

  // Busca os dados ao montar o componente
  useEffect(() => {
    fetchActionPlanDetails();
  }, [actionPlanId]);

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <Layout>
      <div className="box">
        {actionPlan ? (
          <>
            <h1 className="title">Plano de Ação - {moment(actionPlan.created_at).format('MMMM YYYY')}</h1>
            <p><strong>Empresa:</strong> {actionPlan.company_name}</p>
            <p><strong>Descrição:</strong> {actionPlan.description}</p>
            <p><strong>Data de Término:</strong> {moment(actionPlan.end_date).format('DD/MM/YYYY')}</p>
            <p><strong>Status:</strong> {actionPlan.status}</p>

            {actionPlan.attachment && (
              <p>
                <strong>Anexo:</strong> <a href={actionPlan.attachment} download>Baixar Anexo</a>
              </p>
            )}
          </>
        ) : (
          <p>Plano de Ação não encontrado.</p>
        )}
      </div>
    </Layout>
  );
};

export default ActionPlanView;
