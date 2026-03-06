import { msalConfig, loginRequest } from './msalConfig';

describe('msalConfig', () => {
  it('uses root redirect URI for compatibility', () => {
    expect(msalConfig.auth.redirectUri).toBe(`${window.location.origin}/`);
    expect(msalConfig.auth.postLogoutRedirectUri).toBe(`${window.location.origin}/`);
  });

  it('keeps expected scope for backend API', () => {
    expect(loginRequest.scopes).toContain('api://5880ebd1-ae22-4814-8378-b292515758be/read');
  });
});
