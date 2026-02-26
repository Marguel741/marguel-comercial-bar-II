export const roundKz = (value: number): number => {
  return Math.round(value);
};

export const formatKz = (value: number): string => {
  return value.toLocaleString('pt-AO', { maximumFractionDigits: 0 }) + ' Kz';
};
