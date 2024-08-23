import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const location = useLocation(); // Para destacar o item ativo

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
          <li className={location.pathname === '/profile' ? 'active' : ''}>
            <Link to="/profile">Empresas</Link>
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
      </div>


    </aside>
  );
};

export default Sidebar;
