import React, { createContext, useContext, useState, useEffect } from 'react';

// Criação do contexto
const ThemeContext = createContext();

// Hook para acessar o contexto facilmente
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Recupera o tema salvo no localStorage ou usa 'light' como padrão
  const storedTheme = localStorage.getItem('theme') || 'light';
  const [theme, setTheme] = useState(storedTheme);

  // Efeito para atualizar o atributo data-theme no <html> e salvar no localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
