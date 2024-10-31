import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import moment from 'moment';
import useFetchPlanActionDetails from '../../hooks/useFetchPlanActionDetails';
import { STATUS_CHOICES } from '../../utils/StatusChoices';

const ActionPlanView = () => {
  const { actionPlanId } = useParams(); // Obtém o ID do plano de ação da URL
  const { actionPlan, loading } = useFetchPlanActionDetails(actionPlanId);


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
            <p>
              <strong>Status:</strong>{' '}
              <span className={`tag ${STATUS_CHOICES[actionPlan.status]?.className}`}>
                {STATUS_CHOICES[actionPlan.status]?.label || actionPlan.status}
              </span>
            </p>
            <hr />

            <p><strong>Resposta:</strong> {actionPlan.response_company}</p>
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
