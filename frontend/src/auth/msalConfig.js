export const msalConfig = {
  auth: {
    clientId: "f748929f-6ab2-4629-8869-ca082101f538", // ID do frontend
    authority: "https://login.microsoftonline.com/72565908-10ef-498e-b93e-c94978366018", // tenant_id
    redirectUri: "http://localhost:3000", // ou a URL do seu app
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["api://5880ebd1-ae22-4814-8378-b292515758be/read"]
};