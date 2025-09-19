import React, { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';

const Topbar = () => {
  const { user, poles, selectedPoleId, setActivePole, selectedPole, logout } = useContext(AuthContext) || {};

  return (
    <nav 
      className="navbar is-light" 
      role="navigation" 
      aria-label="main navigation" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: '250px', // Largura do sidebar
        right: 0,
        zIndex: 30,
        borderRadius: '0 0 8px 8px',
        margin: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div className="navbar-brand">
        <span className="navbar-item has-text-weight-bold">
          Bem-vindo{user && user.name ? `, ${user.name}` : ''}!
        </span>
      </div>
      <div className="navbar-menu is-active">
        <div className="navbar-end">
    {user?.is_superuser && (
      <div className="navbar-item">
        <div className="field has-addons">
          <div className="control has-icons-left">
            <div className="select is-small">
              <select
                value={selectedPoleId ?? ''}
                onChange={(event) => setActivePole(event.target.value || null)}
                disabled={!poles.length}
              >
                {poles.length === 0 ? (
                  <option value="">Nenhum polo disponível</option>
                ) : (
                  poles.map((pole) => (
                    <option key={pole.id} value={pole.id}>
                      {pole.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <span className="icon is-small is-left">
              <i className="fas fa-building"></i>
            </span>
          </div>
        </div>
      </div>
    )}
      <button className="button is-danger is-small  is-outlined" title='Sair' onClick={logout}>
        <FontAwesomeIcon icon={faSignOutAlt} />
      </button>
  </div>
      </div>
    </nav>
  );
};

export default Topbar;
