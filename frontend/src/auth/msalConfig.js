export const msalConfig = {
  auth: {
    clientId: "f748929f-6ab2-4629-8869-ca082101f538", // ID do frontend
    authority: "https://login.microsoftonline.com/72565908-10ef-498e-b93e-c94978366018", // tenant_id
    redirectUri: "https://sms-avalia.bravaenergia.com",
    postLogoutRedirectUri: "https://sms-avalia.bravaenergia.com",
    navigateToLoginRequestUrl: false, // Evitar navegação automática após login
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true, // Melhor suporte para popup
  },
  system: {
    allowRedirectInIframe: false, // Segurança
    windowHashTimeout: 9000, // Aumentar timeout para processar hash
    iframeHashTimeout: 9000,
    loadFrameTimeout: 9000,
  }
};

export const loginRequest = {
  scopes: ["api://5880ebd1-ae22-4814-8378-b292515758be/read"],
  prompt: "select_account" // Alterado de "login" para "select_account" - mais estável
};
