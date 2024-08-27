import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation(); // Para destacar o item ativo
  const { logout } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2>SMS</h2>
      </header>

      <div className="sidebar-content">
        <p className="menu-label">Geral</p>
        <ul className="menu-list">
          <li className={location.pathname === '/dashboard' ? 'active' : ''}>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li className={location.pathname === '/formularios' ? 'active' : ''}>
            <Link to="/formularios">Formularios</Link>
          </li>
        </ul>
        <p className="menu-label">Administração</p>
        <ul className="menu-list">
          <li className={location.pathname === '/users' ? 'active' : ''}>
            <Link to="/users">Usuários</Link>
          </li>
          <li className={location.pathname === '/settings' ? 'active' : ''}>
            <Link to="/settings">Configurações</Link>
          </li>
        </ul>
        <a className="button is-danger" onClick={logout}>
              Logout
            </a>
      </div>


    </aside>
  );
};

export default Sidebar;
