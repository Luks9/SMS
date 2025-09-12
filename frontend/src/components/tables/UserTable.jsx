import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

const UserTable = ({ users, groups, loading, onEdit, count, currentPage, fetchUsers, paginationLoading }) => {
  const itemsPerPage = 3;

  const getGroupNames = (userGroups) => {
    return userGroups.join(', ');
  };

  if (loading) {
    return (
      <div className="has-text-centered">
        <div className="button is-loading is-white">Carregando...</div>
      </div>
    );
  }

  if (users.length === 0 && !paginationLoading) {
    return <p>Nenhum usuário encontrado.</p>;
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

      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Status</th>
              <th>Permissões</th>
              <th>Editar</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`tag ${user.is_active ? 'is-success' : 'is-danger'}`}>
                    <FontAwesomeIcon icon={user.is_active ? faCheck : faTimes} />
                    &nbsp;{user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  {user.is_superuser ? (
                    <span className="tag is-info">Avaliador</span>
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
    </div>
  );
};

export default UserTable;
