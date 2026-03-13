export const roundKz = (value: number): number => {
  return Math.round(value);
};

export const formatKz = (value: number): string => {
  if (value === undefined || value === null) return '0 Kz';
  return (value || 0).toLocaleString('pt-AO', { maximumFractionDigits: 0 }) + ' Kz';
};

// Função auxiliar para limpar caracteres invisíveis (lixo) de strings de data e normalizar formatos para YYYY-MM-DD
export const cleanDate = (str: string) => {
  if (!str) return '';
  // Remove caracteres não-ASCII e espaços
  let cleaned = str.replace(/[^\x20-\x7E]/g, '').trim();
  
  // Se já estiver no formato YYYY-MM-DD, retorna ele
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Se estiver no formato DD/MM/YYYY, converte para YYYY-MM-DD
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      if (year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Tenta converter via Date object se for um formato reconhecido
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return formatDateISO(d);
    }
  } catch (e) {
    // ignore
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

// Converte YYYY-MM-DD para formato de exibição local (DD/MM/YYYY)
export const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};
