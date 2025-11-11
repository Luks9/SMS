export const ANSWER_CHOICES = [
  { value: 'NA', label: 'Não Aplicável', className: 'is-light' },
  { value: 'C', label: 'Conforme', className: 'is-success' },
  { value: 'NC', label: 'Não Conforme', className: 'is-danger' },
  { value: 'A', label: 'Em Análise', className: 'is-warning' },
];

export const ANSWER_CHOICES_MAP = ANSWER_CHOICES.reduce((acc, choice) => {
  acc[choice.value] = { label: choice.label, className: choice.className };
  return acc;
}, {});
