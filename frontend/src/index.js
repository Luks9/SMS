// index.js
import React from "react";
import { createRoot } from 'react-dom/client';
import "bulma/css/bulma.min.css";
import App from "./App";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from "./context/AuthContext"; // Certifique-se de importar como AuthProvider

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="*" element={<App />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
