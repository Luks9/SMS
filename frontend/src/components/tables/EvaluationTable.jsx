import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faEdit, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../context/AuthContext';
import Pagination from './Pagination'; 
import 'moment/locale/pt-br';

moment.locale('pt-br');

const STATUS_CHOICES = {
  'PENDING': { label: 'Pendente', className: 'is-danger' },
  'IN_PROGRESS': { label: 'Em Progresso', className: 'is-warning' },
  'COMPLETED': { label: 'Concluída', className: 'is-success' },
};

const EvaluationTable = ({ evaluations, refreshEvaluations }) => {
  const { getToken } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Defina o número de itens por página

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = evaluations.slice(indexOfFirstItem, indexOfLastItem);

  const handleEdit = (evaluation) => {
    // Função de edição
  };

  const calculate = async (evaluation) => {
    try {
    const token = getToken();
    await axios.get(`/api/evaluation/${evaluation}/calculate-score/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    alert('Nota calculada')
    refreshEvaluations();
  } catch(error){
    console.error('Erro ao calcular a avaliação:', error);
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
        refreshEvaluations(); // Atualiza a tabela após a exclusão
      } catch (error) {
        console.error('Erro ao excluir a avaliação:', error);
      }
    }
  };

  // Função para calcular o progresso da avaliação em percentual
  const calculateProgressPercentage = (evaluation) => {
    if (evaluation.total_questions === 0) return 0;
    return Math.round((evaluation.answered_questions / evaluation.total_questions) * 100);
  };

  // Função para determinar a classe da cor da barra de progresso
  const getProgressBarColor = (percentage) => {
    if (percentage <= 25) return 'is-danger';    
    if (percentage <= 50) return 'is-warning';   
    if (percentage <= 75) return 'is-info';      
    return 'is-success';                        
  };

  if (evaluations.length === 0) {
    return <p>Nenhuma avaliação encontrada.</p>;
  }

  return (
    <>
      <table className="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Competência</th>
            <th>Empresa</th>
            <th>Formulário</th>
            <th>Data Limite</th>
            <th>Nota</th>
            <th>Status</th>
            <th>Progresso</th>
            {/* <th>Editar</th> */}
            <th>Excluir</th>
            <th>Calcular Nota</th>
            <th>Respostas</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((evaluation) => {
            const progressPercentage = calculateProgressPercentage(evaluation);
            const progressBarColor = getProgressBarColor(progressPercentage);

            return (
              <tr key={evaluation.id}>
                <td>{moment(evaluation.period).format('MMM/YYYY')}</td>
                <td>{evaluation.company_name}</td>
                <td>{evaluation.form_name}</td>
                <td>{moment(evaluation.valid_until).format('DD/MM/YYYY')}</td>
                <td>{evaluation.score.toFixed(2)}</td>
                <td>
                  <span className={`tag ${STATUS_CHOICES[evaluation.status]?.className}`}>
                    {STATUS_CHOICES[evaluation.status]?.label || evaluation.status}
                  </span>
                </td>
                <td>
                  <progress
                    className={`progress ${progressBarColor}`} // Cor dinâmica
                    value={progressPercentage}
                    max="100"
                  >
                    {progressPercentage}%
                  </progress>
                </td>
                {/* <td>
                  <button
                    className="button is-light"
                    onClick={() => handleEdit(evaluation.id)}
                  >
                    <FontAwesomeIcon icon={faEdit} size="lg" />
                  </button>
                </td> */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="button is-light"
                    onClick={() => handleDelete(evaluation.id)}
                  >
                    <FontAwesomeIcon icon={faTrashCan} size="lg" color="red" />
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="button is-light"
                    onClick={() => calculate(evaluation.id) }
                  >
                    <FontAwesomeIcon icon={faCalculator} size="lg" />
                  </button>
                </td>
                <td>
                  <Link to={`/evaluation/${evaluation.id}/details`} className="button is-info is-light">
                    Respostas
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Pagination
        totalItems={evaluations.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </>
  );
};

export default EvaluationTable;
