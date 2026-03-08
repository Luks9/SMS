import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import TableSearchInput from '../inputs/TableSearchInput';
import '../../styles/CompanyTable.css';

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
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchIsLoading = paginationLoading;

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' })),
    [companies]
  );

  const isEmpty = sortedCompanies.length === 0;

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
    setDeleteError(null);
    setCompanyToDelete(company);
  };

  const handleConfirmDelete = async () => {
    if (!companyToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      await onDelete(companyToDelete.id);
      setCompanyToDelete(null);
    } catch (error) {
      setDeleteError('Erro ao excluir empresa. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setCompanyToDelete(null);
  };

  return (
    <div className="company-table-wrapper">
      {paginationLoading && (
        <div className="company-table-overlay">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <span className="company-table-overlay-label">Carregando...</span>
        </div>
      )}

      {deleteError && (
        <div className="notification is-danger">
          <button type="button" className="delete" onClick={() => setDeleteError(null)} />
          {deleteError}
        </div>
      )}

      <div className="company-table-toolbar">
        <div className="company-table-search">
          <TableSearchInput
            value={searchValue}
            onSearch={onSearch}
            placeholder={searchPlaceholder}
            isLoading={searchIsLoading}
          />
        </div>
      </div>

      {isEmpty ? (
        paginationLoading ? null : <p className="has-text-grey">Nenhuma empresa encontrada.</p>
      ) : (
        <div className="table-container">
          <table className="table is-fullwidth is-striped is-hoverable company-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Dominio</th>
                <th className="has-text-centered">Status</th>
                <th className="has-text-centered">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company) => (
                <tr key={company.id}>
                  <td className="company-cell-name">{company.name}</td>
                  <td className="company-cell-cnpj">{company.cnpj || '-'}</td>
                  <td>
                    {company.dominio ? (
                      <span className="tag is-link is-light company-domain-badge" title={company.dominio}>
                        {company.dominio}
                      </span>
                    ) : (
                      <span className="tag is-light company-domain-badge">-</span>
                    )}
                  </td>
                  <td className="has-text-centered company-cell-status">
                    <span className={`tag company-status-badge ${company.is_active ? 'is-success' : 'is-danger'}`}>
                      <FontAwesomeIcon icon={company.is_active ? faCheck : faTimes} />
                      &nbsp;{company.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="has-text-centered company-cell-actions">
                    <div className="company-actions-inline">
                      <button
                        className="button is-small is-info"
                        onClick={() => onEdit(company)}
                        disabled={paginationLoading}
                        title="Editar empresa"
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

      {companyToDelete && (
        <div className="modal is-active">
          <div className="modal-background" onClick={handleCancelDelete}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Confirmar exclusao</p>
              <button
                type="button"
                className="delete"
                aria-label="close"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              />
            </header>
            <section className="modal-card-body">
              <p>
                Tem certeza que deseja excluir a empresa <strong>{companyToDelete.name}</strong>?
              </p>
              <p className="has-text-danger mt-3">Essa operacao nao pode ser desfeita.</p>
            </section>
            <footer className="modal-card-foot">
              <button
                type="button"
                className={`button is-danger ${isDeleting ? 'is-loading' : ''}`}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                Excluir
              </button>
              <button
                type="button"
                className="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancelar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyTable;
