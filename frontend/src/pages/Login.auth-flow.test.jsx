import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseMsal = jest.fn();

jest.mock('@azure/msal-react', () => ({
  useMsal: () => mockUseMsal(),
}));

jest.mock('../context/AuthContext', () => {
  const ReactLib = require('react');
  return {
    AuthContext: ReactLib.createContext({}),
  };
});

import Login from './Login';
import { AuthContext } from '../context/AuthContext';

const buildAuthValue = (overrides = {}) => ({
  login: jest.fn(),
  message: null,
  setMessage: jest.fn(),
  showCompanySelection: false,
  setShowCompanySelection: jest.fn(),
  handleCompanySelection: jest.fn(),
  user: null,
  ...overrides,
});

describe('Login auth flow robustness', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('is idempotent for repeated login clicks (single popup flight)', () => {
    let resolvePopup;
    const pending = new Promise((resolve) => {
      resolvePopup = resolve;
    });

    const instance = {
      getActiveAccount: jest.fn(() => null),
      setActiveAccount: jest.fn(),
      acquireTokenSilent: jest.fn(),
      loginPopup: jest.fn(() => pending),
    };

    mockUseMsal.mockReturnValue({
      instance,
      inProgress: 'none',
      accounts: [],
    });

    render(
      <AuthContext.Provider value={buildAuthValue()}>
        <Login />
      </AuthContext.Provider>
    );

    const button = screen.getByRole('button', { name: /entrar com microsoft/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(instance.loginPopup).toHaveBeenCalledTimes(1);
    resolvePopup({ account: null });
  });

  it('shows friendly error when popup login fails', async () => {
    const popupError = new Error('Popup blocked');
    const setMessage = jest.fn();

    const instance = {
      getActiveAccount: jest.fn(() => null),
      setActiveAccount: jest.fn(),
      acquireTokenSilent: jest.fn(),
      loginPopup: jest.fn().mockRejectedValueOnce(popupError),
    };

    mockUseMsal.mockReturnValue({
      instance,
      inProgress: 'none',
      accounts: [],
    });

    render(
      <AuthContext.Provider value={buildAuthValue({ setMessage })}>
        <Login />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /entrar com microsoft/i }));

    await waitFor(() => expect(instance.loginPopup).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(setMessage).toHaveBeenCalledWith(
        'Nao foi possivel completar a autenticacao com a Microsoft via popup. Verifique bloqueio de popup no navegador e tente novamente.'
      )
    );
  });
});
