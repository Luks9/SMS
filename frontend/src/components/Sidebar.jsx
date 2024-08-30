import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faFileAlt, faUsers, faCog, faSignOutAlt, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation(); // Para destacar o item ativo
  const { logout } = useContext(AuthContext);

  // Verifica o tipo de usuário
  const userType = localStorage.getItem('userType');
  const dashboardLink = userType === 'admin' ? '/admin-dashboard' : '/empresa-dashboard';

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2>SMS</h2>
      </header>

      <div className="sidebar-content">
        <p className="menu-label">Geral</p>
        <ul className="menu-list">
          <li className={location.pathname === dashboardLink ? 'active' : ''}>
            <Link to={dashboardLink} aria-current={location.pathname === dashboardLink ? 'page' : undefined}>
              <FontAwesomeIcon icon={faTachometerAlt} /> Dashboard
            </Link>
          </li>
        </ul>
          
        <p className="menu-label">Administração</p>
        <ul className="menu-list">
          {userType === 'admin' && (
            <li className={location.pathname === '/enviar-avaliacao' ? 'active' : ''}>
              <Link to="/enviar-avaliacao" aria-current={location.pathname === '/enviar-avaliacao' ? 'page' : undefined}>
                <FontAwesomeIcon icon={faPaperPlane} /> Enviar Avaliação
              </Link>
            </li>
          )}
          {userType === 'admin' && (
            <li className={location.pathname === '/formularios' ? 'active' : ''}>
              <Link to="/formularios" aria-current={location.pathname === '/formularios' ? 'page' : undefined}>
                <FontAwesomeIcon icon={faFileAlt} /> Formulários
              </Link>
            </li>
          )}
          {/* <li className={location.pathname === '/users' ? 'active' : ''}>
            <Link to="/users" aria-current={location.pathname === '/users' ? 'page' : undefined}>
              <FontAwesomeIcon icon={faUsers} /> Usuários
            </Link>
          </li> */}
          <li className={location.pathname === '/settings' ? 'active' : ''}>
            <Link to="/settings" aria-current={location.pathname === '/settings' ? 'page' : undefined}>
              <FontAwesomeIcon icon={faCog} /> Configurações
            </Link>
          </li>
        </ul>

        <button className="button is-danger" onClick={logout}>
          <FontAwesomeIcon icon={faSignOutAlt} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
