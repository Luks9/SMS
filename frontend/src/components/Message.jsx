import React, { useEffect } from 'react';

const Message = ({ message, type, onClose }) => {
  useEffect(() => {
    if (typeof onClose !== 'function') return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`notification is-${type}`}>
      {message}
      {typeof onClose === 'function' && (
        <button className="delete" onClick={onClose}></button>
      )}
    </div>
  );
};

export default Message;
