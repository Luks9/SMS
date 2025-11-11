import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faFileAlt,
  faNotesMedical,
  faPaperPlane,
  faFileContract,
  faUsers,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const userType = localStorage.getItem('userType');
  const formData = user?.formData || {};

  const routes = [
    {
      to: userType === 'admin' ? '/admin-dashboard' : '/empresa-dashboard',
      label: 'Dashboard',
      icon: faTachometerAlt,
      allowed: ['admin', 'empresa'],
    },
    {
      to: '/gerenciar-empresa',
      label: 'Gerenciar Empresa',
      icon: faBuilding,
      allowed: ['admin'],
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
      visible: user?.is_staff && formData?.is_superuser,
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
            .filter(
              route =>
                route.allowed.includes(userType) &&
                (route.visible === undefined || route.visible)
            )
            .map(route => (
              <li
                key={route.to}
                className={location.pathname === route.to ? 'active' : ''}
              >
                <Link
                  to={route.to}
                  aria-current={
                    location.pathname === route.to ? 'page' : undefined
                  }
                >
                  <FontAwesomeIcon icon={route.icon} /> &nbsp; {route.label}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
