import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import CompanySelectionModal from '../components/CompanySelectionModal';
import Message from '../components/Message'; // Importa o componente Message
import '../styles/Login.css';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';

const Login = () => {

  const { instance } = useMsal();

  const { 
    login, 
    message, 
    setMessage, 
    showCompanySelection,
    setShowCompanySelection,
    handleCompanySelection,
    user
  } = useContext(AuthContext);

  const handleLogin = () => {
    instance.loginPopup(loginRequest).then(response => {
       login(response.accessToken);
    }).catch((e) => {
      console.error(e);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    //login(username, password);
  };

  const handleCloseCompanyModal = () => {
    setShowCompanySelection(false);
    // Optionally logout the user if they close without selecting
    // logout();
  };

  return (
    <div className="login-container">
      <div className="login-columns">
        <div className="login-column">
          {message && (
            <Message
              message={message}
              type={message.includes('sucesso') ? 'success' : 'danger'}
              onClose={() => setMessage(null)}
            />
          )} 
<div className="login-header">
  <img src="/LOGO_Brava.png" alt="Logo" className="login-logo" />
  <h1 className="login-title">SMS AVALIA</h1>
  <p className="login-subtitle">Acesse com sua conta corporativa Microsoft</p>
</div>

<div className="box">
  <div className="btn-login-field">
    <label className="login-label">Login</label>
    <div className="control">
      <button 
        onClick={handleLogin} 
        className="login-button" 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
      >
        <FontAwesomeIcon icon={faMicrosoft} />
        Entrar com Microsoft
      </button>
    </div>
  </div>
</div>

        </div>
      </div>
      
      {/* Modal de seleção de empresa */}
      {showCompanySelection && user && user.companies && user.companies.length > 1 && (
        <CompanySelectionModal
          companies={user.companies}
          user={user}
          onSelectCompany={handleCompanySelection}
          onClose={handleCloseCompanyModal}
        />
      )}
    </div>
  );
};

export default Login;
