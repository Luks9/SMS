import { buildContextSummary } from './companyContext';

describe('buildContextSummary', () => {
  it('returns empty summary for empty contexts', () => {
    const result = buildContextSummary([], 2);
    expect(result.visible).toHaveLength(0);
    expect(result.hiddenCount).toBe(0);
    expect(result.hidden).toHaveLength(0);
  });

  it('returns all contexts as visible when below limit', () => {
    const contexts = [
      { id: 1, code: 'AMBI', name: 'Ambipar' },
      { id: 2, code: 'PERB', name: 'Perbras' },
    ];
    const result = buildContextSummary(contexts, 3);

    expect(result.visible).toHaveLength(2);
    expect(result.hiddenCount).toBe(0);
    expect(result.hidden).toHaveLength(0);
  });

  it('returns hidden count and hidden list when above limit', () => {
    const contexts = [
      { id: 1, code: 'AMBI', name: 'Ambipar' },
      { id: 2, code: 'PERB', name: 'Perbras' },
      { id: 3, code: 'BENE', name: 'Benevix' },
      { id: 4, code: 'ATI', name: 'ATI' },
    ];
    const result = buildContextSummary(contexts, 2);

    expect(result.visible).toHaveLength(2);
    expect(result.hiddenCount).toBe(2);
    expect(result.hidden.map((item) => item.code)).toEqual(['BENE', 'ATI']);
  });
});
