import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

const UserTable = ({ users, groups, loading, onEdit, onDelete }) => {

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

  return (
    <div className="table-container">
      <table className="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Status</th>
            <th>Permissões</th>
            <th>Grupos</th>
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
                <div className="tags">
                  {user.is_staff && <span className="tag is-info">Staff</span>}
                  {user.is_superuser && <span className="tag is-warning">Super User</span>}
                </div>
              </td>
              <td>
                <span className="tag is-light">{getGroupNames(user.groups)}</span>
              </td>
              <td>
                <div className="buttons">
                  <button 
                    className="button is-small is-info"
                    onClick={() => onEdit(user)}
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
  );
};

export default UserTable;
