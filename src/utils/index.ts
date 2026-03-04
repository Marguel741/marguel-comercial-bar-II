export const roundKz = (value: number): number => {
  return Math.round(value);
};

export const formatKz = (value: number): string => {
  if (value === undefined || value === null) return '0 Kz';
  return (value || 0).toLocaleString('pt-AO', { maximumFractionDigits: 0 }) + ' Kz';
};
