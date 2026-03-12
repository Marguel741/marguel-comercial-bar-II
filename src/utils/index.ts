export const roundKz = (value: number): number => {
  return Math.round(value);
};

export const formatKz = (value: number): string => {
  if (value === undefined || value === null) return '0 Kz';
  return (value || 0).toLocaleString('pt-AO', { maximumFractionDigits: 0 }) + ' Kz';
};

// Função auxiliar para limpar caracteres invisíveis (lixo) de strings de data e normalizar formatos
export const cleanDate = (str: string) => {
  if (!str) return '';
  // Remove caracteres não-ASCII e espaços
  let cleaned = str.replace(/[^\x20-\x7E]/g, '').trim();
  
  // Normalização de formato YYYY-MM-DD para DD/MM/YYYY
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return cleaned;
};

// Gera data no formato YYYY-MM-DD independente do navegador
export const formatDateISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
