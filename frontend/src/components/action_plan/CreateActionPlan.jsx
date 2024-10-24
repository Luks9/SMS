import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';
import useFetchEvaluation from '../../hooks/useFetchEvaluation';
import { useParams } from 'react-router-dom'; // Para acessar parâmetros da URL
import { AuthContext } from '../../context/AuthContext';
import moment from 'moment';
import 'moment/locale/pt-br';

const CreateActionPlan = () => {
  const { user, getToken } = useContext(AuthContext);
  const { evaluationId } = useParams(); // Pega o ID da avaliação da URL
  const { evaluation } = useFetchEvaluation(evaluationId);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company: '',
    description: '',
    end_date: '',
    responsible: user.id,
  });
  const [message, setMessage] = useState('');
  
  const today = moment().format('YYYY-MM-DD');

  useEffect(() => {
    if (evaluation) {
      setFormData((prevData) => ({
        ...prevData,
        company: evaluation.company,
      }));
    }
  }, [evaluation]);

  // Função para criar o plano de ação
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    try {
      const response = await axios.post('/api/action-plans/', {
        evaluation: evaluationId,
        ...formData,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('Plano de Ação criado com sucesso!');

      // Redireciona para a página de visualização do plano de ação criado
      const actionPlanId = response.data.id; // Assumindo que o ID do plano de ação criado vem na resposta
      navigate(`/action-plan/${actionPlanId}/view`); // Redireciona para a página de visualização
    } catch (error) {
      console.error('Erro ao criar o plano de ação:', error);
      setMessage('Erro ao criar o plano de ação.');
    }
  };

  return (
    <Layout>
    <div className="box">
      <h1 className="title">Novo Plano de Ação</h1>
      <h2 className="subtitle">{evaluation.company_name} - {moment(evaluation.period).locale('pt-br').format('MMMM/YYYY')}</h2>
      {message && <div className="notification is-info">{message}</div>}
      <form onSubmit={handleSubmit}>
        <div className='columns'>
          <div className="column is-half">
            <div className="field">
              <label className="label">Descrição</label>
              <div className="control">
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  required
                />
              </div>
            </div>
          </div>
          <div className="column">
            <div className="field">
              <label className="label">Data de Término</label>
              <div className="control">
                <input
                  className="input"
                  type="date"
                  value={formData.end_date}
                  min={today}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
        <div className="column">
          <div className="field">
          <label className="label">&nbsp;</label>
            <div className="control">
              <button type="submit" className="button is-primary">Criar Plano de Ação</button>
            </div>
          </div>
        </div>
        </div>
      </form>
    </div>
    </Layout>
  );
};

export default CreateActionPlan;