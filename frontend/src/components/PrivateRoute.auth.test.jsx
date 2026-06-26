import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

jest.mock('../context/AuthContext', () => {
  const ReactLib = require('react');
  return {
    AuthContext: ReactLib.createContext({}),
  };
});

import { AuthContext } from '../context/AuthContext';
import { AdminRoute, EmpresaRoute, PrivateRoute } from './PrivateRoute';

const renderWithAuth = (ui, authValue, initialPath = '/protected') => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('PrivateRoute auth guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows protected route when user is authenticated', () => {
    renderWithAuth(
      <PrivateRoute>
        <div>secured-content</div>
      </PrivateRoute>,
      { user: { id: 1 }, isLoading: false }
    );

    expect(screen.getByText('secured-content')).toBeTruthy();
  });

  it('redirects to login when unauthenticated', () => {
    renderWithAuth(
      <PrivateRoute>
        <div>secured-content</div>
      </PrivateRoute>,
      { user: null, isLoading: false }
    );

    expect(screen.getByText('login-page')).toBeTruthy();
  });

  it('blocks admin route when userType is not admin', () => {
    localStorage.setItem('userType', 'empresa');

    renderWithAuth(
      <AdminRoute>
        <div>admin-content</div>
      </AdminRoute>,
      { user: { id: 1 }, isLoading: false }
    );

    expect(screen.getByText('login-page')).toBeTruthy();
  });

  it('allows empresa route when userType is empresa', () => {
    localStorage.setItem('userType', 'empresa');

    renderWithAuth(
      <EmpresaRoute>
        <div>empresa-content</div>
      </EmpresaRoute>,
      { user: { id: 2 }, isLoading: false }
    );

    expect(screen.getByText('empresa-content')).toBeTruthy();
  });
});
