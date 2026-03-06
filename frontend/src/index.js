// index.js
import React from "react";
import { createRoot } from 'react-dom/client';
import "bulma/css/bulma.min.css";
import App from "./App";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from "./context/AuthContext"; // Certifique-se de importar como AuthProvider
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalInstance";

const root = createRoot(document.getElementById('root'));
const authHashPattern = /(code=|error=|state=)/i;
const hasAuthHash = typeof window !== "undefined" && authHashPattern.test(window.location.hash || "");
const isAuthCallbackPage =
  hasAuthHash &&
  typeof window !== "undefined" &&
  (window.location.pathname === "/" || window.location.pathname === "/login");

const renderApp = () => {
  root.render(
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
};

if (isAuthCallbackPage) {
  const notifyParent = () => {
    const payload = JSON.stringify({
      ts: Date.now(),
      path: window.location.pathname,
      hasHash: hasAuthHash,
    });

    try {
      localStorage.setItem("msal_popup_callback", payload);
    } catch (_error) {
      // ignore
    }

    try {
      const channel = new BroadcastChannel("msal-auth");
      channel.postMessage({ type: "popup_callback", payload });
      channel.close();
    } catch (_error) {
      // ignore
    }
  };

  notifyParent();

  // Em fluxo loginPopup, o hash deve ser consumido pela janela principal via monitorPopupForHash.
  // No Chrome, window.opener pode ficar nulo dependendo de politicas; por isso usamos o hash como sinal primario.
  root.render(
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <p>Concluindo autenticacao...</p>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Esta janela sera fechada automaticamente.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            window.close();
          } catch (_error) {
            // ignore
          }
        }}
      >
        Fechar agora
      </button>
    </div>
  );
  // Melhor esforco para fechar popup apos o hash ser processado na janela principal.
  // Nao depende de window.opener (Chrome pode reportar nulo em alguns cenarios).
  setTimeout(() => {
    try {
      window.open("", "_self");
      window.close();
    } catch (_error) {
      // ignore
    }
  }, 1200);
} else {
  msalInstance
    .initialize()
    .then(() => {
      return msalInstance.handleRedirectPromise();
    })
    .then((response) => {
      if (response?.account) {
        msalInstance.setActiveAccount(response.account);
      }
      renderApp();
    })
    .catch((error) => {
      console.error("Falha ao inicializar MSAL:", error);
      renderApp();
    });
}
