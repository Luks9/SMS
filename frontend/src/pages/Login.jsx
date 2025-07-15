import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Message from '../components/Message'; // Importa o componente Message
import '../styles/Login.css';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';

const Login = () => {

  const { instance } = useMsal();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 

  const { login, message, setMessage } = useContext(AuthContext);

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
          <h1 className="login-title">SMS AVALIA</h1>
          {/* <form onSubmit={handleSubmit} className="box">
            <div className="login-field">
              <label className="login-label">Username</label>
              <div className="control">
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="control">
                <input
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <div className="control">
                <button type="submit" disabled className="login-button-disabled">Login</button>
              </div>
            </div>
          </form> */}
          <div className="box">
            <div className="btn-login-field">
              <label className="login-label">Login</label>
              <div className="control">
                <button onClick={handleLogin} className="login-button is-primary" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FontAwesomeIcon icon={faMicrosoft} />
                   Login com Microsoft
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
