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
export const formatDateISO = (date: Date | string | number) => {
  if (!date) return '';
  
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }
  
  if (isNaN(d.getTime())) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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

// Função para disparar eventos customizados de forma segura (fallback para navegadores antigos/ambientes restritos)
export const dispatchCustomEvent = (name: string, detail?: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Tenta usar o construtor moderno primeiro
    const event = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
  } catch (e) {
    // Fallback para ambientes onde new CustomEvent falha (Illegal constructor)
    try {
      const event = document.createEvent('CustomEvent');
      (event as any).initCustomEvent(name, true, true, detail);
      window.dispatchEvent(event);
    } catch (err) {
      console.error(`Falha crítica ao disparar evento customizado: ${name}`, err);
      
      // Último recurso: disparar via callback global se existir (padrão legado)
      if ((window as any).onCustomEvent) {
        (window as any).onCustomEvent(name, detail);
      }
    }
  }
};

// Formatação de moeda segura (evita Illegal constructor em Intl.NumberFormat)
export const safeFormatCurrency = (value: number, currency = 'AOA', locale = 'pt-AO') => {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    }
  } catch (e) {
    console.warn('Intl.NumberFormat falhou ou não é um construtor válido, usando fallback:', e);
  }
  
  // Fallback manual de formatação
  const formattedValue = (value || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formattedValue} ${currency}`;
};

// Instanciação segura de FileReader
export const getFileReader = (): FileReader | null => {
  try {
    if (typeof FileReader !== 'undefined' && typeof FileReader === 'function') {
      return new FileReader();
    }
  } catch (e) {
    console.error('Falha ao instanciar FileReader (Illegal constructor?):', e);
  }
  return null;
};

// Gerador de UUID seguro com fallback para contextos não-seguros (HTTP ou iframes restritos)
export const generateUUID = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {
    // ignore and fallback
  }
  
  // Fallback para contextos onde randomUUID não está disponível
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
