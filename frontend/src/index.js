// index.js
import React from "react";
import { createRoot } from 'react-dom/client';
import "bulma/css/bulma.min.css";
import App from "./App";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from "./context/AuthContext"; // Certifique-se de importar como AuthProvider
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalInstance";

createRoot(document.getElementById('root')).render(
  <MsalProvider instance={msalInstance}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </MsalProvider>
);
