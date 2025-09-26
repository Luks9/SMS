import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faFileAlt, faNotesMedical, faSignOutAlt, faPaperPlane, faFileContract, faUsers } from '@fortawesome/free-solid-svg-icons';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation(); // Para destacar o item ativo
  const { logout } = useContext(AuthContext);

  // Verifica o tipo de usuário
  const userType = localStorage.getItem('userType');
  
  // Definição das rotas disponíveis
  const routes = [
    {
      to: userType === 'admin' ? '/admin-dashboard' : '/empresa-dashboard',
      label: 'Dashboard',
      icon: faTachometerAlt,
      allowed: ['admin', 'empresa'],
    },
    {
      to: '/enviar-avaliacao',
      label: 'Enviar Avaliação',
      icon: faPaperPlane,
      allowed: ['admin'],
    },
    {
      to: '/formularios',
      label: 'Formulários',
      icon: faFileAlt,
      allowed: ['admin'],
    },
    {
      to: '/usuarios',
      label: 'Usuários',
      icon: faUsers,
      allowed: ['admin'],
    },
    {
      to: '/empresa-avaliacao',
      label: 'Avaliações',
      icon: faFileContract,
      allowed: ['empresa'],
    },
    {
      to: '/empresa-plano-acao',
      label: 'Planos de Ação',
      icon: faPaperPlane,
      allowed: ['empresa'],
    },
    {
      to: '/rem-empresa',
      label: 'REM',
      icon: faNotesMedical,
      allowed: ['empresa'],
    },
    {
      to: '/rem-avaliador',
      label: 'REM Avaliador',
      icon: faNotesMedical,
      allowed: ['admin'],
    },
    
    
    // {/rem-form
    //   to: '/settings',
    //   label: 'Configurações',
    //   icon: faCog,
    //   allowed: ['admin', 'empresa'],
    // }
  ];

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2>SMS AVALIA</h2>
      </header>

      <div className="sidebar-content">
        <p className="menu-label">Geral</p>
        <ul className="menu-list">
          {routes
            .filter(route => route.allowed.includes(userType)) // Filtra rotas permitidas para o tipo de usuário
            .map(route => (
              <li key={route.to} className={location.pathname === route.to ? 'active' : ''}>
                <Link to={route.to} aria-current={location.pathname === route.to ? 'page' : undefined}>
                  <FontAwesomeIcon icon={route.icon} /> &nbsp; {route.label}
                </Link>
              </li>
            ))
          }
        </ul>
      </div>

      {/* <footer className="sidebar-footer">
        <ul className="menu-list">
          <li>
            <button className="button is-danger is-small" onClick={logout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> &nbsp; Logout
            </button>
          </li>
        </ul>
      </footer> */}
    </aside>
  );
};

export default Sidebar;
