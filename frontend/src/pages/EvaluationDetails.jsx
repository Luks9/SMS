// src/pages/EvaluationDetails.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import AnswerList from '../components/AnswerList';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import 'moment/locale/pt-br';


moment.locale('pt-br'); 

const EvaluationDetails = () => {
    const { getToken } = useContext(AuthContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const fromCompanyManagement = location.state?.from === 'company-management';
    const previousFilters = location.state?.filters;
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchEvaluationDetails = async () => {
        try {
          const token = getToken();
          const response = await axios.get(`/api/evaluation/${id}/details/`,{
              headers: {
                  Authorization: `Bearer ${token}`,
              },
          });
          setEvaluation(response.data);
          setLoading(false);
        } catch (error) {
          console.error('Erro ao buscar detalhes da avaliação:', error);
          setLoading(false);
        }
      };

  useEffect(() => {
    

    fetchEvaluationDetails();
  }, [id]);

  if (loading) {
    return <Layout><p>Carregando...</p></Layout>;
  }

  if (!evaluation) {
    return <Layout><p>Avaliação não encontrada.</p></Layout>;
  }
  
  return (
    <Layout>
        {fromCompanyManagement && (
          <button
            className="button is-light mb-4"
            onClick={() =>
              navigate('/gerenciar-empresa', {
                state: { filters: previousFilters },
              })
            }
          >
            ← Voltar para Gerenciar Empresa
          </button>
        )}
        <h1 className="title">Detalhes da Avaliação</h1>
        
        <h2 className="subtitle is-5">Empresa: {evaluation.company_name}</h2>
        <h2 className="subtitle is-5">
            Competência: {moment(evaluation.period).format('MMMM [de] YYYY').toUpperCase() }
        </h2>
      <div className="card">
        <header className="card-header">
            <p className="card-header-title">Perguntas e Respostas</p>
        </header>
        <div className="card-content">
            <AnswerList questions={evaluation.questions} fetchEvaluationDetails={fetchEvaluationDetails} />
        </div>
    </div>
    </Layout>
  );
};

export default EvaluationDetails;
