import React, { useState, useContext, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faEdit } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import EditQuestionModal from '../modals/EditQuestionModal';
import { AuthContext } from '../../context/AuthContext';
import Pagination from './Pagination'; // Importando o componente de paginação

const QuestionTable = ({ questions, loading, refreshQuestions, categories }) => {
  const { getToken } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Defina o número de itens por página

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = questions.slice(indexOfFirstItem, indexOfLastItem);

  const handleEdit = (question) => {
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta pergunta?");
    if (confirmed) {
      try {
        const token = getToken();
        await axios.delete(`/api/questions/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        refreshQuestions(); // Atualiza a tabela após a exclusão
      } catch (error) {
        console.error('Erro ao excluir a pergunta:', error);
      }
    }
  };

  useEffect(() => {
    // Reseta para a primeira página quando as perguntas forem atualizadas
    setCurrentPage(1);
  }, [questions]);

  if (loading) {
    return <p>Carregando perguntas...</p>;
  }

  if (questions.length === 0) {
    return <p>Nenhuma pergunta encontrada.</p>;
  }

  return (
    <>
      <table className="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Pergunta</th>
            <th>Categoria</th>
            <th>Subcategoria</th>
            <th>Editar</th>
            <th>Excluir</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((question) => (
            <tr key={question.id}>
              <td>{question.question}</td>
              <td>{question.category_name}</td>
              <td>{question.subcategory_name}</td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => handleEdit(question)}
                >
                  <FontAwesomeIcon icon={faEdit} size="lg" />
                </button>
              </td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => handleDelete(question.id)}
                >
                  <FontAwesomeIcon icon={faTrashCan} size="lg" color="red" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        totalItems={questions.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Renderizar o modal de edição */}
      {selectedQuestion && (
        <EditQuestionModal
          question={selectedQuestion}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          refreshQuestions={refreshQuestions}
          categories={categories}
        />
      )}
    </>
  );
};

export default QuestionTable;
