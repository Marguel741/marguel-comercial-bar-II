/**
 * Formats a number as Kwanza currency string.
 * Ensures the value is treated as an integer.
 */
export const formatKz = (value: number): string => {
  if (value === undefined || value === null) return '0';
  return Math.round(value || 0).toLocaleString('pt-AO');
};

/**
 * Rounds a number to the nearest integer for Kwanza calculations.
 * Used to eliminate floating point errors before storage or display.
 */
export const roundKz = (value: number): number => {
  return Math.round(value);
};
