import React, { useEffect, useMemo, useRef } from 'react';
import styles from './CompanyCell.module.css';

const ContextPopover = ({ anchorRef, contexts, onClose }) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      const target = event.target;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, onClose]);

  const focusableSelector = useMemo(
    () => 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    []
  );

  useEffect(() => {
    const node = popoverRef.current;
    if (!node) return;

    const focusable = node.querySelectorAll(focusableSelector);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      node.focus();
    }

    const trap = (event) => {
      if (event.key !== 'Tab') return;

      const list = node.querySelectorAll(focusableSelector);
      if (!list.length) {
        event.preventDefault();
        return;
      }

      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', trap);
    return () => node.removeEventListener('keydown', trap);
  }, [focusableSelector]);

  return (
    <div className={styles.popover} ref={popoverRef} role="dialog" aria-label="Lista completa de contextos" tabIndex={-1}>
      <div className={styles.popoverHeader}>
        <strong>Contextos vinculados</strong>
        <button type="button" onClick={onClose} aria-label="Fechar lista de contextos">
          Fechar
        </button>
      </div>
      <ul className={styles.popoverList}>
        {contexts.map((ctx) => (
          <li key={ctx.id}>
            <span className={styles.popoverCode}>{ctx.code}</span>
            <span className={styles.popoverName}>{ctx.poleLabel || ctx.poleName || ctx.name}</span>
            {ctx.companyCode || ctx.companyName ? (
              <small className={styles.popoverMeta}>
                {ctx.companyCode || ctx.companyName}
                {ctx.companyCode && ctx.companyName ? ` - ${ctx.companyName}` : ''}
              </small>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(ContextPopover);
