import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import TableSearchInput from '../inputs/TableSearchInput';

const CompanyTable = ({
  companies,
  loading,
  onEdit,
  onDelete,
  paginationLoading = false,
  searchValue = '',
  onSearch = () => {},
  searchPlaceholder = 'Buscar empresa...'
}) => {
  const [deleteError, setDeleteError] = useState(null);
  const searchIsLoading = paginationLoading;
  const isEmpty = companies.length === 0;

  if (loading) {
    return (
      <div className="has-text-centered">
        <div className="button is-loading is-white">Carregando...</div>
      </div>
    );
  }

  const handleDelete = (company) => {
    if (company.has_evaluations) {
      setDeleteError(`Nao e possivel excluir a empresa "${company.name}" pois possui avaliacoes ativas associadas.`);
      return;
    }

    if (window.confirm(`Tem certeza que deseja deletar a empresa "${company.name}"?`)) {
      setDeleteError(null);
      onDelete(company.id);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
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

      {deleteError && (
        <div className="notification is-danger">
          <button type="button" className="delete" onClick={() => setDeleteError(null)} />
          {deleteError}
        </div>
      )}

      <div
        className="mb-4"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          maxWidth: '360px',
          marginLeft: 'auto',
        }}
      >
        <TableSearchInput
          value={searchValue}
          onSearch={onSearch}
          placeholder={searchPlaceholder}
          isLoading={searchIsLoading}
        />
      </div>

      {isEmpty ? (
        paginationLoading ? null : <p>Nenhuma empresa encontrada.</p>
      ) : (
        <div className="table-container">
          <table className="table is-fullwidth is-striped is-hoverable">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Dominio</th>
                <th>Status</th>
                <th colSpan={2}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
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
                        type="button"
                        className="button is-small is-danger"
                        onClick={() => handleDelete(company)}
                        disabled={paginationLoading}
                        title={company.has_evaluations ? 'Empresa possui avaliacoes ativas associadas' : undefined}
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
      )}
    </div>
  );
};

export default CompanyTable;
