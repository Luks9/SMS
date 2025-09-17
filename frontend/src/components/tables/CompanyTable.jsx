import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Pagination from './Pagination';

const CompanyTable = ({ companies, loading, onEdit, onDelete, paginationLoading }) => {

  if (loading) {
    return (
      <div className="has-text-centered">
        <div className="button is-loading is-white">Carregando...</div>
      </div>
    );
  }

  if (companies.length === 0 && !paginationLoading) {
    return <p>Nenhuma empresa encontrada.</p>;
  }

  const handleDelete = (company) => {
    if (window.confirm(`Tem certeza que deseja deletar a empresa "${company.name}"?`)) {
      onDelete(company.id);
    }
  };

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

      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Domínio</th>
              <th>Status</th>
              <th colSpan={2}>Ações</th>
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
                <td>
                  <div className="buttons">
                    <button 
                      className="button is-small is-info"
                      onClick={() => onEdit(company)}
                      disabled={paginationLoading}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button 
                      className="button is-small is-danger"
                      onClick={() => handleDelete(company)}
                      disabled={paginationLoading}
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
    </div>
  );
};

export default CompanyTable;
