import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

const CompanyTable = ({ companies, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="has-text-centered">
        <div className="button is-loading is-white">Carregando...</div>
      </div>
    );
  }

  const handleDelete = (company) => {
    if (window.confirm(`Tem certeza que deseja deletar a empresa "${company.name}"?`)) {
      onDelete(company.id);
    }
  };

  return (
    <div className="table-container">
      <table className="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CNPJ</th>
            <th>Domínio</th>
            <th>Status</th>
            <th>Usuário</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(company => (
            <tr key={company.id}>
              <td>{company.name}</td>
              <td>{company.cnpj}</td>
              <td>{company.dominio || '-'}</td>
              <td>
                <span className={`tag ${company.is_active ? 'is-success' : 'is-danger'}`}>
                  <FontAwesomeIcon icon={company.is_active ? faCheck : faTimes} />
                  &nbsp;{company.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>{company.user ? company.user.username : '-'}</td>
              <td>
                <div className="buttons">
                  <button 
                    className="button is-small is-info"
                    onClick={() => onEdit(company)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button 
                    className="button is-small is-danger"
                    onClick={() => handleDelete(company)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyTable;
