const abbreviate = (value, max = 4) => {
  const text = (value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!text) return '';
  return text.slice(0, max);
};

export const normalizeCompany = (company) => {
  if (!company || typeof company !== 'object') return null;

  const name = (company.name || '').trim();
  const explicitCode = abbreviate((company.code || company.description || company.dominio || '').trim(), 4);
  const derivedCode = abbreviate(name, 4);
  const code = explicitCode || derivedCode;

  if (!name && !code) return null;

  return {
    id: company.id ?? null,
    code: code || 'EMP',
    name: name || 'Empresa sem nome',
  };
};

export const normalizeContexts = (contexts) => {
  if (!Array.isArray(contexts)) return [];

  const normalized = contexts
    .map((context, index) => {
      if (!context || typeof context !== 'object') return null;

      const name = (context.name || '').trim();
      const companyName = (context.companyName || '').trim();
      const companyCode = abbreviate(
        (context.companyCode || context.companyDescription || context.companyDomain || context.description || '').trim(),
        4
      );
      const rawCode = abbreviate((context.code || '').trim(), 4);
      const code = companyCode || rawCode || abbreviate(name, 4) || `C${index + 1}`;
      const poleName = (context.poleName || name || '').trim();
      const poleDescription = (context.poleDescription || '').trim();
      const poleLabel = poleDescription || poleName || 'Sem polo';
      const poleCode = abbreviate((context.poleCode || '').trim(), 4) || abbreviate(poleName, 4) || 'SPL';

      return {
        id: context.id ?? `${context.companyId || 'no-company'}-${index}`,
        code,
        name: name || 'Contexto sem nome',
        poleCode,
        poleDescription,
        poleLabel,
        poleName: poleName || 'Sem polo',
        companyId: context.companyId ?? null,
        companyCode: companyCode || '',
        companyName: companyName || '',
      };
    })
    .filter(Boolean);

  const dedupMap = new Map();
  normalized.forEach((ctx) => {
    const key = `${ctx.companyId || 'no-company'}|${ctx.code}|${ctx.poleLabel}|${ctx.poleName}`;
    if (!dedupMap.has(key)) dedupMap.set(key, ctx);
  });

  return Array.from(dedupMap.values());
};

export const buildContextSummary = (contexts, limit = 2) => {
  const normalized = normalizeContexts(contexts);
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 2;
  const visible = normalized.slice(0, normalizedLimit);
  const hidden = normalized.slice(normalizedLimit);

  return {
    visible,
    hiddenCount: hidden.length,
    hidden,
  };
};

export const mapUserCompanyData = (user, selectedPoleId = null) => {
  const companies = Array.isArray(user?.companies) ? user.companies : [];
  const sortedCompanies = [...companies]
    .filter((company) => company?.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const mainCompany = normalizeCompany(user?.company || sortedCompanies[0] || null);

  let contexts = Array.isArray(user?.contexts) ? user.contexts : [];
  if (!contexts.length) {
    const derived = [];
    sortedCompanies.forEach((company) => {
      const companyName = company?.name || '';
      const companyCode = normalizeCompany(company)?.code || '';
      const poles = Array.isArray(company?.poles) ? company.poles : [];
      if (!poles.length) {
          derived.push({
            id: `${company.id}-sem-polo`,
            code: companyCode || 'EMP',
            name: 'Sem polo',
            poleCode: 'SPL',
            poleDescription: '',
            poleLabel: 'Sem polo',
            poleName: 'Sem polo',
            companyId: company?.id ?? null,
            companyCode,
            companyName,
          });
      } else {
        poles.forEach((pole) => {
          derived.push({
            id: `${company.id}-${pole.id}`,
            code: companyCode || 'EMP',
            name: pole?.name || 'Polo',
            poleCode: abbreviate(pole?.name || '', 4) || 'POLO',
            poleDescription: pole?.description || '',
            poleLabel: pole?.description || pole?.name || 'Polo',
            poleName: pole?.name || 'Polo',
            companyId: company?.id ?? null,
            companyCode,
            companyName,
          });
        });
      }
    });
    contexts = derived;
  }

  const hasContextForSelectedPole = selectedPoleId
    ? contexts.some((ctx) => String(ctx.id).endsWith(`-${selectedPoleId}`))
    : true;

  const missingContextFromCompanies = sortedCompanies.some(
    (company) => !Array.isArray(company?.poles) || company.poles.length === 0
  );

  const issues = {
    missingCompany: Boolean(user?.issues?.missingCompany) || !mainCompany,
    missingContextPolo: Boolean(
      user?.issues?.missingContextPolo
      || missingContextFromCompanies
      || (selectedPoleId && !hasContextForSelectedPole && sortedCompanies.length > 0)
    ),
  };

  return {
    company: mainCompany,
    contexts: normalizeContexts(contexts),
    issues,
  };
};
