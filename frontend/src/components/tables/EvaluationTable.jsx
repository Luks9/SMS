import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faEdit } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../context/AuthContext';
import Pagination from './Pagination'; // Importando o componente de paginação

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
    // Lógica para editar a avaliação (redirecionar para uma página de edição, abrir um modal, etc.)

  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta avaliação?");
    if (confirmed) {
      try {
        const token = getToken();
        await axios.delete(`/api/evaluation/${id}/`, {
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

  if (evaluations.length === 0) {
    return <p>Nenhuma avaliação encontrada.</p>;
  }

  return (
    <>
      <table className="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Data</th>
            <th>Empresa</th>
            <th>Formulário</th>
            <th>Data Limite</th>
            <th>Status</th>
            <th>Editar</th>
            <th>Excluir</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((evaluation) => (
            <tr key={evaluation.id}>
                <td>{moment(evaluation.created_at).format('DD/MM/YYYY')}</td>
                <td>{evaluation.company_name}</td>
                <td>{evaluation.form_name}</td>
                <td>{moment(evaluation.valid_until).format('DD/MM/YYYY')}</td>
                <td>
                    <span className={`tag ${STATUS_CHOICES[evaluation.status]?.className}`}>
                        {STATUS_CHOICES[evaluation.status]?.label || evaluation.status}
                    </span>
                </td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => handleEdit(evaluation)}
                >
                  <FontAwesomeIcon icon={faEdit} size="lg" />
                </button>
              </td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => handleDelete(evaluation.id)}
                >
                  <FontAwesomeIcon icon={faTrashCan} size="lg" color="red" />
                </button>
              </td>
            </tr>
          ))}
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
