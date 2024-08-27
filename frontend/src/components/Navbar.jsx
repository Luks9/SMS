import React, { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import img from "../images/logo-3R.png";
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useContext(AuthContext);


  return (
    <nav className="navbar is-sucess" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <a className="navbar-item" href="/">
          <img src={img} alt="Logo" width="112" height="35" />
        </a>
      </div>
      <div className="navbar-end">
        <div className="navbar-item">
          <div className="buttons">
            <button className="button is-light" onClick={toggleTheme}>
              <FontAwesomeIcon
                icon={theme === 'light' ? faMoon : faSun}
                size="lg"
              />
            </button>
            <a className="button is-danger" onClick={logout}>
              Logout
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
