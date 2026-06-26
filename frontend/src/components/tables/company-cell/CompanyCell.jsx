import React, { useMemo, useRef, useState } from 'react';
import Chip from './Chip';
import ContextPopover from './ContextPopover';
import { buildContextSummary, normalizeCompany, normalizeContexts } from '../../../utils/companyContext';
import styles from './CompanyCell.module.css';

const CompanyCell = ({ company, contexts, issues }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const moreButtonRef = useRef(null);

  const normalizedCompany = useMemo(() => normalizeCompany(company), [company]);
  const normalizedContexts = useMemo(() => normalizeContexts(contexts), [contexts]);
  const mainContext = useMemo(() => {
    if (!normalizedCompany?.id) return null;
    return normalizedContexts.find((ctx) => String(ctx.companyId) === String(normalizedCompany.id)) || null;
  }, [normalizedCompany?.id, normalizedContexts]);
  const displayContexts = useMemo(() => {
    if (!normalizedCompany?.id) return normalizedContexts;
    // Remove apenas o contexto principal exibido na primeira linha.
    if (!mainContext?.id) return normalizedContexts;
    return normalizedContexts.filter((ctx) => String(ctx.id) !== String(mainContext.id));
  }, [mainContext?.id, normalizedCompany?.id, normalizedContexts]);
  const summary = useMemo(() => buildContextSummary(displayContexts, 3), [displayContexts]);

  const hasNoData = !normalizedCompany && normalizedContexts.length === 0;
  const companyTones = ['info', 'success', 'warning', 'primary'];
  const getContextTone = (ctx, index) => {
    const base = ctx?.companyId ?? index;
    const numeric = Number(String(base).replace(/\D/g, '')) || index;
    return companyTones[numeric % companyTones.length];
  };

  return (
    <div className={styles.cell}>
      <div className={styles.rowMain}>
        {normalizedCompany ? (
          <Chip
            label={`${normalizedCompany.code} · ${mainContext?.poleLabel || mainContext?.poleName || 'SPL'}`}
            title={`${normalizedCompany.name} - ${mainContext?.poleLabel || mainContext?.poleName || 'Sem polo'}`}
            tone="primary"
            ariaLabel={`Empresa principal ${normalizedCompany.name} no polo ${mainContext?.poleLabel || mainContext?.poleName || 'Sem polo'}`}
          />
        ) : (
          <Chip label="Sem empresa" tone="neutral" ariaLabel="Usuario sem empresa" />
        )}
      </div>

      {!hasNoData && normalizedContexts.length > 0 ? (
        <div className={styles.rowContexts}>
          {summary.visible.map((ctx, idx) => (
            <Chip
              key={ctx.id}
              label={`${ctx.code} · ${ctx.poleLabel || ctx.poleName || 'SPL'}`}
              title={`${ctx.companyName || ''}${ctx.companyName ? ' - ' : ''}${ctx.poleLabel || ctx.poleName || ctx.name || 'Sem polo'}`}
              tone={getContextTone(ctx, idx)}
              ariaLabel={`Empresa ${ctx.companyName || ctx.code} no polo ${ctx.poleLabel || ctx.poleName || 'Sem polo'}`}
            />
          ))}

          {summary.hiddenCount > 0 ? (
            <>
              <button
                type="button"
                className={`${styles.chip} ${styles.toneWarning}`}
                title="Mostrar todos os contextos"
                aria-label={`Mostrar mais ${summary.hiddenCount} contextos`}
                ref={moreButtonRef}
                onClick={() => setIsPopoverOpen((prev) => !prev)}
              >
                +{summary.hiddenCount}
              </button>
              {isPopoverOpen ? (
                <ContextPopover
                  anchorRef={moreButtonRef}
                  contexts={normalizedContexts}
                  onClose={() => setIsPopoverOpen(false)}
                />
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(CompanyCell);
