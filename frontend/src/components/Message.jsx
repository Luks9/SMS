import React, { useEffect } from 'react';

const Message = ({ message, type, onClose }) => {
  // Define o tempo para esconder a mensagem automaticamente (5 segundos)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // A mensagem desaparecerá após 5 segundos

    return () => clearTimeout(timer); // Limpa o timer ao desmontar
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`notification is-${type}`}>
      <button className="delete" onClick={onClose}></button>
    </div>
  );
};

export default Message;
