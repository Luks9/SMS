import React, { useState, useContext } from 'react';
import {AuthContext}  from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="login-container">
      <div className="login-columns">
        <div className="login-column">
          <form onSubmit={handleSubmit} className="box">
            <h1 className="login-title">SMS</h1>
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
                <button type="submit" className="login-button">Login</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
