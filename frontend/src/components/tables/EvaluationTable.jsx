// src/components/tables/EvaluationTable.jsx

import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashCan, 
  faCalculator, 
  faSpinner, 
  faClipboardQuestion, 
  faClipboardCheck, 
  faClipboardList, 
  faCheckSquare, 
  faClock 
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../context/AuthContext';
import Pagination from './Pagination'; 
import 'moment/locale/pt-br';
import { STATUS_CHOICES } from '../../utils/StatusChoices';

moment.locale('pt-br');

const EvaluationTable = ({ evaluations, refreshEvaluations, count, currentPage, fetchEvaluations, paginationLoading }) => {
  const { getToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loadingCalculation, setLoadingCalculation] = useState(null);
  const itemsPerPage = 10;

  const calculate = async (evaluationId) => {
    setLoadingCalculation(evaluationId);
    try {
      const token = getToken();
      await axios.get(`/api/evaluation/${evaluationId}/calculate-score/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Nota calculada');
      refreshEvaluations(currentPage);
    } catch (error) {
      console.error('Erro ao calcular a avaliação:', error);
    } finally {
      setLoadingCalculation(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta avaliação?");
    if (confirmed) {
      try {
        const token = getToken();
        const is_active = { 'is_active': false };
        await axios.patch(`/api/evaluation/${id}/`, is_active, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        refreshEvaluations(currentPage);
      } catch (error) {
        console.error('Erro ao excluir a avaliação:', error);
      }
    }
  };

  const calculateProgressPercentage = (evaluation) => {
    if (evaluation.total_questions === 0) return 0;
    return Math.round((evaluation.answered_questions / evaluation.total_questions) * 100);
  };

  const getProgressBarColor = (percentage) => {
    if (percentage <= 25) return 'is-danger';    
    if (percentage <= 50) return 'is-warning';   
    if (percentage <= 75) return 'is-info';      
    return 'is-success';                        
  };

  const getScoreLabel = (score) => {
    if (score >= 85) {
      return 'is-success';
    } else if (score >= 80) {
      return 'is-warning';
    } else {
      return 'is-danger';
    }
  };

  const shouldShowActionPlan = (evaluation) => {
    const validUntilMoment = moment(evaluation.valid_until);
    if ((validUntilMoment.isBefore(moment())) && evaluation.score < 85) {
      return true;
    }
    return false;
  };

  const redirectTo = (path) => {
    navigate(path);
  };

  if (evaluations.length === 0 && !paginationLoading) {
    return <p>Nenhuma avaliação encontrada.</p>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Indicador de carregamento durante a troca de páginas */}
      {paginationLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <span style={{ marginLeft: '10px' }}>Carregando...</span>
        </div>
      )}

      <table className="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th>Competência</th>
            <th>Empresa</th>
            <th>Formulário</th>
            <th>Data Limite</th>
            <th>Nota</th>
            <th>Status</th>
            <th>Progresso</th>
            <th colSpan={4}></th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => {
            const progressPercentage = calculateProgressPercentage(evaluation);
            const progressBarColor = getProgressBarColor(progressPercentage);

            return (
              <tr key={evaluation.id}>
                <td>{moment(evaluation.period).format('MMM/YYYY')}</td>
                <td>{evaluation.company_name}</td>
                <td>{evaluation.form_name}</td>
                <td>{moment(evaluation.valid_until).format('DD/MM/YYYY')}</td>
                <td>
                  <span className={`tag ${getScoreLabel(evaluation.score)}`}>
                    {evaluation.score.toFixed(2)}
                  </span>
                </td>
                <td>
                  <span className={`tag ${STATUS_CHOICES[evaluation.status]?.className}`}>
                    {STATUS_CHOICES[evaluation.status]?.label || evaluation.status}
                  </span>
                </td>
                <td>
                  <progress
                    className={`progress ${progressBarColor}`}
                    value={progressPercentage}
                    max="100"
                  >
                    {progressPercentage}%
                  </progress>
                </td>
                <td className="px-0" style={{ textAlign: 'center' }}>
                  {evaluation.status !== 'COMPLETED' && (
                    <button
                      className="button is-light is-small"
                      onClick={() => handleDelete(evaluation.id)}
                      title="Excluir avaliação"
                      disabled={paginationLoading}
                    >
                      <FontAwesomeIcon icon={faTrashCan} size="lg" color="red" />
                    </button>
                  )}
                </td>
                <td className="px-0" style={{ textAlign: 'center' }}>
                  <button
                    className="button is-light is-small"
                    onClick={() => calculate(evaluation.id)}
                    disabled={loadingCalculation === evaluation.id || paginationLoading}
                    title="Calcular nota"
                  >
                    {loadingCalculation === evaluation.id ? (
                      <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                    ) : (
                      <FontAwesomeIcon icon={faCalculator} size="lg" />
                    )}
                  </button>
                </td>
                <td className="px-0">
                  <button
                    onClick={() => redirectTo(`/evaluation/${evaluation.id}/details`)}
                    className="button is-info is-light is-small"
                    title="Respostas"
                    disabled={paginationLoading}
                  >
                    <FontAwesomeIcon icon={faClipboardQuestion} size="lg" />
                  </button>
                </td>
                <td className="px-0">
                  {shouldShowActionPlan(evaluation) ? (
                    evaluation.action_plan ? (
                      <button
                        onClick={() => redirectTo(`/action-plan/${evaluation.action_plan}/view`)}
                        className="button is-info is-light is-small"
                        title="Plano de Ação"
                        disabled={paginationLoading}
                      >
                        <FontAwesomeIcon icon={faClipboardCheck} size="lg" />
                      </button>
                    ) : (
                      <button
                        onClick={() => redirectTo(`/action-plan/${evaluation.id}/create`)}
                        className="button is-warning is-light is-small"
                        title="Criar Plano de Ação"
                        disabled={paginationLoading}
                      >
                        <FontAwesomeIcon icon={faClipboardList} size="lg" />
                      </button>
                    )
                  ) : evaluation.status === 'COMPLETED' ? (
                    <button
                      className="button is-success is-small"
                      title="Aprovado"
                      disabled={paginationLoading}
                    >
                      <FontAwesomeIcon icon={faCheckSquare} size="lg" />
                    </button>
                  ) : (
                    <button
                      className="button is-warning is-small is-light"
                      title="Em Andamento"
                      disabled={paginationLoading}
                    >
                      <FontAwesomeIcon icon={faClock} size="lg" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination
        totalItems={count}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={(page) => fetchEvaluations(page)}
        disabled={paginationLoading} // Passa o estado de carregamento para a paginação
      />
    </div>
  );
};

export default EvaluationTable;