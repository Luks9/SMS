import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const { instance, inProgress, accounts } = useMsal();

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
  const backendLoginInFlightRef = useRef(false);
  const interactiveLoginInFlightRef = useRef(false);

  const createPopupSignalWaiter = useCallback((timeoutMs = 15000) => {
    let cleanup = () => {};
    let settled = false;

    const promise = new Promise((resolve, reject) => {
      let timeoutId = null;
      let channel = null;

      cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('storage', onStorage);
        if (channel) {
          try {
            channel.close();
          } catch (_error) {
            // ignore
          }
        }
      };

      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };

      const onStorage = (event) => {
        if (event.key === 'msal_popup_callback' && event.newValue) {
          done();
        }
      };

      window.addEventListener('storage', onStorage);

      try {
        channel = new BroadcastChannel('msal-auth');
        channel.onmessage = (event) => {
          if (event?.data?.type === 'popup_callback') {
            done();
          }
        };
      } catch (_error) {
        // ignore
      }

      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Popup callback signal timeout'));
      }, timeoutMs);
    });

    return {
      promise,
      cancel: () => {
        if (settled) return;
        settled = true;
        cleanup();
      },
    };
  }, []);

  const completeLoginWithAccount = useCallback(async (account) => {
    if (!account || backendLoginInFlightRef.current) return;
    backendLoginInFlightRef.current = true;

    try {
      instance.setActiveAccount(account);
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      if (!tokenResponse?.accessToken) {
        throw new Error('Token de acesso nao retornado pela Microsoft.');
      }

      await login(tokenResponse.accessToken);
    } finally {
      backendLoginInFlightRef.current = false;
    }
  }, [instance, login]);

  const loginWithPopupRobust = useCallback(async () => {
    // Mantem o fluxo simples e previsivel: popup unico com redirectUri padrao da app.
    return instance.loginPopup(loginRequest);
  }, [instance]);

  useEffect(() => {
    const logoutInProgress = sessionStorage.getItem('msal_logout_in_progress') === '1';
    if (!logoutInProgress) return;

    const activeAccount = instance.getActiveAccount?.() || accounts?.[0] || null;
    if (!activeAccount) {
      sessionStorage.removeItem('msal_logout_in_progress');
    }
  }, [accounts, instance]);

  const handleLogin = async () => {
    setMessage(null);

    if (inProgress && inProgress !== 'none') {
      setMessage('A autenticacao com a Microsoft ja esta em andamento. Aguarde alguns segundos e tente novamente.');
      return;
    }

    if (interactiveLoginInFlightRef.current) {
      return;
    }

    interactiveLoginInFlightRef.current = true;
    setIsAuthenticating(true);

    try {
      setMessage('Abrindo popup de autenticacao Microsoft...');
      const popupPromise = loginWithPopupRobust();
      // Evita rejection nao tratada caso fluxo conclua via sinal fallback.
      popupPromise.catch(() => {});
      const popupSignalWaiter = createPopupSignalWaiter();

      const result = await Promise.race([
        popupPromise.then((response) => ({ type: 'popup', response })),
        popupSignalWaiter.promise
          .then(() => ({ type: 'signal' }))
          .catch(() => ({ type: 'signal-timeout' })),
      ]);
      popupSignalWaiter.cancel();

      if (result.type === 'popup') {
        const popupResponse = result.response;

        if (popupResponse?.accessToken) {
          await login(popupResponse.accessToken);
          return;
        }

        const popupAccount = popupResponse?.account || instance.getActiveAccount?.() || null;
        if (popupAccount) {
          await completeLoginWithAccount(popupAccount);
          return;
        }

        throw new Error('Conta nao retornada pelo popup.');
      }

      if (result.type === 'signal-timeout') {
        throw new Error('Tempo esgotado aguardando callback do popup.');
      }

      // Fallback para navegadores onde loginPopup nao resolve por politica de janela.
      const accountFromCache = instance.getActiveAccount?.() || accounts?.[0] || instance.getAllAccounts?.()?.[0] || null;
      if (!accountFromCache) {
        throw new Error('Conta nao retornada apos callback do popup.');
      }

      await completeLoginWithAccount(accountFromCache);
    } catch (popupError) {
      console.error(popupError);
      setMessage('Nao foi possivel completar a autenticacao com a Microsoft via popup. Verifique bloqueio de popup no navegador e tente novamente.');
    } finally {
      interactiveLoginInFlightRef.current = false;
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
