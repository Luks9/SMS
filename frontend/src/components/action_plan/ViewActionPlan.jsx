import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; // Para acessar parâmetros da URL
import { AuthContext } from '../../context/AuthContext';
import moment from 'moment'; 
import Layout from '../../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload } from '@fortawesome/free-solid-svg-icons';
import { ANSWER_CHOICES_MAP } from '../../utils/AnswerChoices';


const ViewActionPlan = () => {
  const { getToken } = useContext(AuthContext);
  const { actionPlanId } = useParams(); // Pega o ID do plano de ação da URL
  const [actionPlan, setActionPlan] = useState(null); // Estado para o plano de ação
  const [loading, setLoading] = useState(true); // Estado de loading

  const STATUS_CHOICES = {
    'PENDING': { label: 'Pendente', className: 'is-danger' },
    'IN_PROGRESS': { label: 'Em Progresso', className: 'is-warning' },
    'COMPLETED': { label: 'Concluída', className: 'is-success' },
  };

  // Função para buscar o plano de ação
  useEffect(() => {
    const fetchActionPlan = async () => {
      setLoading(true);
      const token = getToken();
      try {
        const response = await axios.get(`/api/action-plans/${actionPlanId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActionPlan(response.data); // Salva o plano de ação no estado
      } catch (error) {
        console.error('Erro ao buscar o plano de ação:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActionPlan();
  }, [actionPlanId, getToken]);

  const handleDownload = async (id, fileName) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/action-plans/${id}/download_attachment_plan_action/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',  // Garante que o arquivo seja tratado corretamente
      });

      // Cria uma URL para o arquivo baixado
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);  // Define o nome do arquivo
      document.body.appendChild(link);
      link.click();

      // Limpa o URL temporário
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
    }
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <Layout>
      <div className="box">
        <h1 className="title">Monitorar Plano de Ação</h1>
        {actionPlan ? (
          <>
            <p><strong>Empresa:</strong> {actionPlan.company_name}</p>
            <p><strong>Descrição:</strong> {actionPlan.description}</p>
            <p><strong>Data de Inicio:</strong> {moment(actionPlan.start_date).format('DD/MM/YYYY')}</p>
            <p><strong>Data de Término:</strong> {moment(actionPlan.end_date).format('DD/MM/YYYY')}</p>
            <p><strong>Status:</strong> <span className={`tag ${STATUS_CHOICES[actionPlan.status]?.className}`}>
                {STATUS_CHOICES[actionPlan.status]?.label || actionPlan.status}
              </span>
            </p>
            {(actionPlan.response_choice_display || actionPlan.response_choice) && (
              <p>
                <strong>Classificação do Avaliado:</strong>{' '}
                {actionPlan.response_choice_display || ANSWER_CHOICES_MAP[actionPlan.response_choice]?.label}
              </p>
            )}
            {actionPlan.response_date && (
              <p><strong>Respondido em:</strong> {moment(actionPlan.response_date).format('DD/MM/YYYY')}</p>
            )}
            <p><strong>Resposta:</strong> {actionPlan.response_company || 'Nenhuma resposta enviada.'}</p>
            {actionPlan.attachment? (
              <p>
                <strong>anexo: </strong>
                <button
                  onClick={() => handleDownload(actionPlan.id, actionPlan.attachment.split('/').pop())}
                >
                  <FontAwesomeIcon icon={faFileDownload} /> Baixar Anexo
                </button>
              </p>
            ) : (
              <p className="has-text-grey">Nenhum anexo disponível.</p>
            )}
          </>
        ) : (
          <p>Nenhum plano de ação encontrado.</p>
        )}
      </div>
    </Layout>
  );
};

export default ViewActionPlan;
