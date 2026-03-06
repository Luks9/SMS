import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import CompanySelectionModal from '../components/CompanySelectionModal';
import Message from '../components/Message';
import '../styles/Login.css';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const { instance, inProgress } = useMsal();

  const {
    login,
    message,
    setMessage,
    showCompanySelection,
    setShowCompanySelection,
    handleCompanySelection,
    user,
  } = useContext(AuthContext);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const completeLogin = useCallback(async (response) => {
    if (!response?.account) {
      throw new Error('Conta Microsoft nao retornada no login.');
    }

    instance.setActiveAccount(response.account);

    let accessToken = response.accessToken;
    if (!accessToken) {
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: response.account,
      });
      accessToken = tokenResponse?.accessToken;
    }

    if (!accessToken) {
      throw new Error('Token de acesso nao retornado pela Microsoft.');
    }

    await login(accessToken);
  }, [instance, login]);

  useEffect(() => {
    instance
      .handleRedirectPromise()
      .then((response) => {
        if (response) {
          return completeLogin(response);
        }
        return null;
      })
      .catch((error) => {
        console.error(error);
        setMessage('Nao foi possivel concluir o retorno da autenticacao Microsoft. Tente novamente.');
      });
  }, [instance, completeLogin, setMessage]);

  const handleLogin = async () => {
    setMessage(null);

    if (inProgress && inProgress !== 'none') {
      setMessage('A autenticacao com a Microsoft ja esta em andamento. Aguarde alguns segundos e tente novamente.');
      return;
    }

    setIsAuthenticating(true);

    try {
      setMessage('Redirecionando para autenticacao Microsoft...');
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error(error);
      setMessage('Nao foi possivel completar a autenticacao com a Microsoft. Feche janelas de login abertas e tente novamente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCloseCompanyModal = () => {
    setShowCompanySelection(false);
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
              <div className="control">
                <button
                  onClick={handleLogin}
                  className="login-button"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
                  disabled={isAuthenticating || (inProgress && inProgress !== 'none')}
                  aria-busy={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faMicrosoft} />
                      Entrar com Microsoft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
