import React from 'react';
import styles from './CompanyCell.module.css';

const toneClassMap = {
  neutral: styles.toneNeutral,
  primary: styles.tonePrimary,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  success: styles.toneSuccess,
};

const Chip = ({ label, title, tone = 'neutral', onClick, ariaLabel, asButton = false, className = '' }) => {
  const composedClassName = `${styles.chip} ${toneClassMap[tone] || styles.toneNeutral} ${className}`.trim();

  if (asButton) {
    return (
      <button
        type="button"
        className={composedClassName}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || label}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={composedClassName} title={title} aria-label={ariaLabel || label}>
      {label}
    </span>
  );
};

export default React.memo(Chip);
