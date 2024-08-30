// src/components/tables/FormTable.jsx
import React, { useContext, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Pagination from './Pagination'; 

const FormTable = ({ forms, loading, refreshForms }) => {
  const { getToken } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // Defina o número de itens por página

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = forms?.slice(indexOfFirstItem, indexOfLastItem);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir este formulário?");
    if (confirmed) {
      try {
        const token = getToken();
        await axios.delete(`/api/forms/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        refreshForms(); // Atualiza a tabela após a exclusão
      } catch (error) {
        console.error('Erro ao excluir o formulário:', error);
      }
    }
  };

  if (loading) {
    return <p>Carregando formulários...</p>;
  }

  if (forms.length === 0) {
    return <p>Nenhum formulário encontrado.</p>;
  }

  return (
    <>
      <table className="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categorias</th>
            <th>Excluir</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((form) => (
            <tr key={form.id}>
              <td>{form.name}</td>
              <td>
              {form.category_names.join(', ')}
              </td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => handleDelete(form.id)}
                >
                  <FontAwesomeIcon icon={faTrashCan} size="lg" color="red" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        totalItems={forms.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </>
  );
};

export default FormTable;
