import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import TableSearchInput from '../inputs/TableSearchInput';

const UserTable = ({
  users,
  loading,
  onEdit,
  paginationLoading,
  searchValue = '',
  onSearch,
  searchPlaceholder = 'Buscar usuário...'
}) => {
  const showEmptyState = !loading && users.length === 0;
  const disableSearch = loading || paginationLoading;

  return (
    <div>
      <div className="mb-4" style={{ maxWidth: '360px', marginLeft: 'auto' }}>
        <TableSearchInput
          value={searchValue}
          onSearch={onSearch}
          isLoading={disableSearch}
          placeholder={searchPlaceholder}
        />
      </div>

      <div style={{ position: 'relative' }}>
        {paginationLoading && !loading && (
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

        {loading ? (
          <div className="has-text-centered">
            <div className="button is-loading is-white" style={{ pointerEvents: 'none' }}>
              Carregando...
            </div>
          </div>
        ) : showEmptyState ? (
          <p>Nenhum usuário encontrado.</p>
        ) : (
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Permissões</th>
                  <th>Editar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.first_name} {user.last_name}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.is_superuser ? '-' : user.companies[0]?.name}</td>
                    <td>
                      <span className={`tag ${user.is_active ? 'is-success' : 'is-danger'}`}>
                        <FontAwesomeIcon icon={user.is_active ? faCheck : faTimes} />
                        &nbsp;{user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      {user.is_superuser ? (
                        <span className="tag is-info" title={user.is_staff ? 'Staff' : ''}>
                          Avaliador
                        </span>
                      ) : (
                        <span className="tag is-warning">Empresa</span>
                      )}
                    </td>
                    <td>
                      <div className="buttons">
                        <button
                          className="button is-small is-info"
                          onClick={() => onEdit(user)}
                          disabled={paginationLoading}
                        >
                          <FontAwesomeIcon icon={faEdit} />
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
    </div>
  );
};

export default UserTable;
