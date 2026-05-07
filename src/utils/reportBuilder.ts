import { formatKz, formatDateISO, formatDisplayDate, cleanDate } from './index';
import { SalesReport, PurchaseRecord, Expense, Transaction, StockOperationLog, PriceHistoryLog, Product, AuditLog } from '../../types';

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface ReportData {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
  reports: SalesReport[];
  purchases: PurchaseRecord[];
  expenses: Expense[];
  transactions: Transaction[];
  stockOperations: StockOperationLog[];
  priceHistory: PriceHistoryLog[];
  products: Product[];
  auditLogs: AuditLog[];
  lockedDays: string[];
  generatedBy: string;
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  day: 'Diário', week: 'Semanal', month: 'Mensal', quarter: 'Trimestral', year: 'Anual'
};

const escapeHtml = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
));

const formatDateTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.toLocaleDateString('pt-AO')} ${d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}`;
};

// Cabeçalho com cores Marguel
const buildHeader = (period: ReportPeriod, startStr: string, endStr: string) => {
  const sameDay = startStr === endStr;
  const periodText = sameDay
    ? formatDisplayDate(startStr)
    : `${formatDisplayDate(startStr)} até ${formatDisplayDate(endStr)}`;
  return `
    <div class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="logo-row">
          <div class="logo-mg">MG</div>
          <div class="logo-text">
            <div class="logo-title">MARGUEL</div>
            <div class="logo-sub">Sistema de Gestão Interna</div>
          </div>
        </div>
        <div class="period-badge">${escapeHtml(PERIOD_LABELS[period])}</div>
        <h1 class="hero-title">Relatório de Gestão</h1>
        <p class="hero-period">${escapeHtml(periodText)}</p>
      </div>
    </div>`;
};

// Cards de síntese
const buildSummary = (data: ReportData) => {
  const totalLifted = data.reports.reduce((a, r) => a + ((r as any).totalLifted ?? (r as any).totals?.lifted ?? 0), 0);
  const totalExpected = data.reports.reduce((a, r) => a + ((r as any).totals?.expected ?? (r as any).totalExpected ?? 0), 0);
  const totalPurchases = data.purchases.reduce((a, p) => a + (p.total || 0), 0);
  const totalExpenses = data.expenses.filter(e => !e.isInformativeOnly && e.status !== 'REVERSED').reduce((a, e) => a + (e.amount || 0), 0);
  const totalProfit = data.reports.reduce((a, r) => a + ((r as any).profit ?? (r as any).totals?.profit ?? 0), 0);
  const margin = totalExpected > 0 ? (totalProfit / totalExpected * 100) : 0;

  // Quebra de pagamentos
  let cashTotal = 0, tpaTotal = 0, transferTotal = 0;
  data.reports.forEach(r => {
    const fin: any = (r as any).financials || {};
    cashTotal += fin.cash ?? (r as any).cash ?? 0;
    tpaTotal += fin.ticket ?? (r as any).tpa ?? 0;
    transferTotal += fin.transfer ?? (r as any).transfer ?? 0;
  });

  // Contagem de dias
  const confirmedDays = data.reports.filter(r => r.status === 'FECHO_CONFIRMADO').length;
  const partialDays = data.reports.filter(r => r.status !== 'FECHO_CONFIRMADO').length;
  const lockedInPeriod = data.lockedDays.filter(d => {
    const c = cleanDate(d); return c >= data.startStr && c <= data.endStr;
  }).length;

  return `
    <div class="section">
      <div class="section-title">Síntese Financeira</div>
      <div class="grid-cards">
        <div class="card card-blue"><div class="card-label">Faturado (Bruto)</div><div class="card-value">${formatKz(totalExpected)}</div></div>
        <div class="card card-green"><div class="card-label">Levantado (Líquido)</div><div class="card-value">${formatKz(totalLifted)}</div></div>
        <div class="card card-orange"><div class="card-label">Compras</div><div class="card-value">${formatKz(totalPurchases)}</div></div>
        <div class="card card-red"><div class="card-label">Despesas</div><div class="card-value">${formatKz(totalExpenses)}</div></div>
        <div class="card card-pink"><div class="card-label">Margem</div><div class="card-value">${margin.toFixed(1)}%</div></div>
        <div class="card card-dark"><div class="card-label">Lucro Estimado</div><div class="card-value">${formatKz(totalProfit)}</div></div>
      </div>
      <div class="info-box">
        <strong>Resumo do período:</strong> ${confirmedDays} ${confirmedDays === 1 ? 'fecho confirmado' : 'fechos confirmados'}, ${partialDays} ${partialDays === 1 ? 'fecho parcial' : 'fechos parciais'}, ${lockedInPeriod} ${lockedInPeriod === 1 ? 'dia bloqueado' : 'dias bloqueados'}.
      </div>
    </div>
    <div class="section">
      <div class="section-title">Distribuição de Pagamentos</div>
      ${buildPaymentPie(cashTotal, tpaTotal, transferTotal)}
    </div>`;
};

// Pizza SVG simples
const buildPaymentPie = (cash: number, tpa: number, transfer: number) => {
  const total = cash + tpa + transfer;
  if (total === 0) return '<p class="empty">Sem pagamentos registados no período.</p>';
  const cashPct = cash / total * 100;
  const tpaPct = tpa / total * 100;
  const transferPct = transfer / total * 100;

  // Calcular ângulos para SVG
  const cx = 110, cy = 110, r = 90;
  const polarToCartesian = (angle: number) => ({
    x: cx + r * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + r * Math.sin((angle - 90) * Math.PI / 180)
  });
  const arcPath = (startAngle: number, endAngle: number, color: string) => {
    if (endAngle - startAngle >= 360) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z" fill="${color}"/>`;
  };

  let angle = 0;
  const slices: string[] = [];
  if (cash > 0) { slices.push(arcPath(angle, angle + cashPct * 3.6, '#10b981')); angle += cashPct * 3.6; }
  if (tpa > 0) { slices.push(arcPath(angle, angle + tpaPct * 3.6, '#003366')); angle += tpaPct * 3.6; }
  if (transfer > 0) { slices.push(arcPath(angle, angle + transferPct * 3.6, '#E3007E')); }

  return `
    <div class="pie-row">
      <svg width="220" height="220" viewBox="0 0 220 220">${slices.join('')}</svg>
      <div class="pie-legend">
        <div class="legend-item"><span class="dot" style="background:#10b981"></span><strong>Cash (Em Mão)</strong><br/><span class="legend-val">${formatKz(cash)} (${cashPct.toFixed(1)}%)</span></div>
        <div class="legend-item"><span class="dot" style="background:#003366"></span><strong>TPA</strong><br/><span class="legend-val">${formatKz(tpa)} (${tpaPct.toFixed(1)}%)</span></div>
        <div class="legend-item"><span class="dot" style="background:#E3007E"></span><strong>Transferência</strong><br/><span class="legend-val">${formatKz(transfer)} (${transferPct.toFixed(1)}%)</span></div>
      </div>
    </div>`;
};

// Vendas detalhadas
const buildSalesSection = (data: ReportData) => {
  const productSummary: Record<string, { qty: number; revenue: number; name: string }> = {};
  data.reports.forEach(r => {
    const items = (r as any).itemsSnapshot || (r as any).itemsSummary || [];
    items.forEach((item: any) => {
      const key = item.name;
      if (!productSummary[key]) productSummary[key] = { qty: 0, revenue: 0, name: item.name };
      productSummary[key].qty += (item.soldQty ?? item.qty ?? 0);
      productSummary[key].revenue += (item.revenue ?? item.total ?? 0);
    });
  });

  const allProducts = Object.values(productSummary);
  const sold = allProducts.filter(p => p.qty > 0);
  const top5 = [...sold].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const bottom5 = [...sold].sort((a, b) => a.revenue - b.revenue).slice(0, 5);
  const alphabetical = [...allProducts].sort((a, b) => a.name.localeCompare(b.name, 'pt'));

  const maxRev = Math.max(...top5.map(p => p.revenue), 1);
  const top5Bars = top5.map(p => `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(p.name)}</div>
      <div class="bar-track"><div class="bar-fill bar-green" style="width:${(p.revenue / maxRev * 100).toFixed(1)}%"></div></div>
      <div class="bar-value">${formatKz(p.revenue)}</div>
    </div>`).join('');

  const bottom5Bars = bottom5.map(p => `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(p.name)}</div>
      <div class="bar-track"><div class="bar-fill bar-amber" style="width:${(p.revenue / maxRev * 100).toFixed(1)}%"></div></div>
      <div class="bar-value">${formatKz(p.revenue)}</div>
    </div>`).join('');

  const alphabeticalRows = alphabetical.map(p => `
    <tr><td>${escapeHtml(p.name)}</td><td class="tr">${p.qty}</td><td class="tr">${formatKz(p.revenue)}</td></tr>`).join('');

  return `
    <div class="section">
      <div class="section-title">Top 5 Mais Vendidos (por receita)</div>
      ${top5.length === 0 ? '<p class="empty">Sem vendas no período.</p>' : `<div class="bars">${top5Bars}</div>`}
    </div>
    ${bottom5.length > 0 ? `
    <div class="section">
      <div class="section-title">Top 5 Menos Vendidos</div>
      <div class="bars">${bottom5Bars}</div>
    </div>` : ''}
    <div class="section">
      <div class="section-title">Lista Completa de Produtos (ordem alfabética)</div>
      <table>
        <thead><tr><th>Produto</th><th class="tr">Quantidade</th><th class="tr">Total Faturado</th></tr></thead>
        <tbody>${alphabeticalRows || '<tr><td colspan="3" class="empty">Sem dados.</td></tr>'}</tbody>
      </table>
    </div>`;
};

// Compras detalhadas
const buildPurchasesSection = (data: ReportData) => {
  if (data.purchases.length === 0) {
    return `<div class="section"><div class="section-title">Compras</div><p class="empty">Sem compras registadas no período.</p></div>`;
  }
  const rows = data.purchases.map(p => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(p.date))}</td>
      <td>${escapeHtml(p.name || 'Compra')}</td>
      <td>${escapeHtml(p.supplier || '—')}</td>
      <td>${escapeHtml(p.completedBy || '—')}</td>
      <td class="tr">${formatKz(p.total || 0)}</td>
    </tr>`).join('');
  return `
    <div class="section">
      <div class="section-title">Compras do Período</div>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Fornecedor</th><th>Por</th><th class="tr">Valor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
};

// Despesas detalhadas
const buildExpensesSection = (data: ReportData) => {
  const real = data.expenses.filter(e => !e.isInformativeOnly && e.status !== 'REVERSED' && !e.isReverted);
  if (real.length === 0) {
    return `<div class="section"><div class="section-title">Despesas</div><p class="empty">Sem despesas registadas no período.</p></div>`;
  }
  // Agrupar por categoria
  const byCategory: Record<string, number> = {};
  real.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0); });

  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `
    <tr><td>${escapeHtml(cat)}</td><td class="tr">${formatKz(val)}</td></tr>`).join('');

  const detailRows = real.sort((a, b) => b.timestamp - a.timestamp).map(e => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(e.date))}</td>
      <td>${escapeHtml(e.title)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.notes || '—')}</td>
      <td>${escapeHtml(e.user || '—')}</td>
      <td class="tr">${formatKz(e.amount || 0)}</td>
    </tr>`).join('');

  return `
    <div class="section">
      <div class="section-title">Despesas por Categoria</div>
      <table class="small">
        <thead><tr><th>Categoria</th><th class="tr">Total</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Lista Detalhada de Despesas</div>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Nota</th><th>Por</th><th class="tr">Valor</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table>
    </div>`;
};

// Movimentação financeira
const buildFinanceSection = (data: ReportData) => {
  const trans = data.transactions
    .filter(t => {
      const d = cleanDate(t.operationalDay || t.date);
      return d >= data.startStr && d <= data.endStr && t.status !== 'REVERSED';
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (trans.length === 0) {
    return `<div class="section"><div class="section-title">Movimentação Financeira</div><p class="empty">Sem movimentações no período.</p></div>`;
  }

  const rows = trans.map(t => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(cleanDate(t.operationalDay || t.date)))}</td>
      <td>${escapeHtml(t.accountName || '—')}</td>
      <td>${escapeHtml(t.category || '—')}</td>
      <td>${escapeHtml(t.description || '—')}</td>
      <td>${escapeHtml(t.performedBy || '—')}</td>
      <td class="tr ${t.type === 'entrada' ? 'tg' : 'tr-red'}">${t.type === 'entrada' ? '+' : '−'} ${formatKz(t.amount || 0)}</td>
    </tr>`).join('');

  return `
    <div class="section">
      <div class="section-title">Movimentação Financeira</div>
      <table>
        <thead><tr><th>Data</th><th>Conta</th><th>Categoria</th><th>Descrição</th><th>Por</th><th class="tr">Valor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
};

// Stock e preços
const buildStockSection = (data: ReportData) => {
  const stockOps = data.stockOperations.filter(s => {
    const d = formatDateISO(new Date(s.timestamp));
    return d >= data.startStr && d <= data.endStr && s.type === 'MANUAL_ADJUSTMENT';
  });
  const priceChanges = data.priceHistory.filter(p => {
    const d = cleanDate(p.date);
    return d >= data.startStr && d <= data.endStr;
  });

  let html = '';

  if (stockOps.length > 0) {
    const stockRows = stockOps.map(s => `
      <tr>
        <td>${escapeHtml(formatDateTime(s.timestamp))}</td>
        <td>${escapeHtml(s.productName || '—')}</td>
        <td class="tr">${s.qtyBefore} → ${s.qtyAfter}</td>
        <td>${escapeHtml(s.reason || '—')}</td>
        <td>${escapeHtml(s.performedBy || '—')}</td>
      </tr>`).join('');
    html += `
      <div class="section">
        <div class="section-title">Ajustes Manuais de Stock</div>
        <table>
          <thead><tr><th>Data/Hora</th><th>Produto</th><th class="tr">Stock</th><th>Motivo</th><th>Por</th></tr></thead>
          <tbody>${stockRows}</tbody>
        </table>
      </div>`;
  }

  if (priceChanges.length > 0) {
    const priceRows = priceChanges.map(p => {
      const sellDelta = p.oldSellPrice > 0 ? ((p.newSellPrice / p.oldSellPrice - 1) * 100).toFixed(1) : '—';
      const buyDelta = p.oldBuyPrice > 0 ? ((p.newBuyPrice / p.oldBuyPrice - 1) * 100).toFixed(1) : '—';
      return `
      <tr>
        <td>${escapeHtml(formatDateTime(p.timestamp))}</td>
        <td>${escapeHtml(p.productName || '—')}</td>
        <td class="tr">${formatKz(p.oldSellPrice)} → ${formatKz(p.newSellPrice)} <span class="delta">(${sellDelta}%)</span></td>
        <td class="tr">${formatKz(p.oldBuyPrice)} → ${formatKz(p.newBuyPrice)} <span class="delta">(${buyDelta}%)</span></td>
        <td>${escapeHtml(p.changedBy || '—')}</td>
      </tr>`;
    }).join('');
    html += `
      <div class="section">
        <div class="section-title">Alterações de Preço</div>
        <table>
          <thead><tr><th>Data/Hora</th><th>Produto</th><th class="tr">Preço de Venda</th><th class="tr">Preço de Compra</th><th>Por</th></tr></thead>
          <tbody>${priceRows}</tbody>
        </table>
      </div>`;
  }

  if (!html) {
    html = `<div class="section"><div class="section-title">Stock e Preços</div><p class="empty">Sem alterações de stock ou preços no período.</p></div>`;
  }

  return html;
};

// Auditoria resumida
const buildAuditSection = (data: ReportData) => {
  const periodLogs = data.auditLogs.filter(l => {
    const d = cleanDate(l.date);
    return d >= data.startStr && d <= data.endStr;
  });

  if (periodLogs.length === 0) {
    return '';
  }

  const byUser: Record<string, number> = {};
  periodLogs.forEach(l => { byUser[l.performedBy] = (byUser[l.performedBy] || 0) + 1; });
  const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return `
    <div class="section">
      <div class="section-title">Auditoria Resumida</div>
      <p><strong>${periodLogs.length}</strong> ${periodLogs.length === 1 ? 'acção registada' : 'acções registadas'} no período.</p>
      <table class="small">
        <thead><tr><th>Top Utilizadores</th><th class="tr">Acções</th></tr></thead>
        <tbody>${topUsers.map(([u, n]) => `<tr><td>${escapeHtml(u)}</td><td class="tr">${n}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
};

// CSS completo
const buildStyles = () => `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; line-height: 1.5; }
  #report-content { padding: 0; }
  .hero { position: relative; padding: 50px 40px; margin-bottom: 30px; overflow: hidden; }
  .hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #003366 0%, #0054A6 50%, #E3007E 100%); }
  .hero-content { position: relative; color: #fff; text-align: center; }
  .logo-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 24px; }
  .logo-mg { width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 28px; letter-spacing: -1px; backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.3); }
  .logo-text { text-align: left; }
  .logo-title { font-weight: 900; font-size: 18px; letter-spacing: 2px; }
  .logo-sub { font-size: 11px; opacity: 0.85; letter-spacing: 1px; }
  .period-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 18px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; backdrop-filter: blur(10px); }
  .hero-title { font-size: 32px; font-weight: 900; margin: 0 0 8px 0; letter-spacing: -1px; }
  .hero-period { font-size: 14px; margin: 0; opacity: 0.9; font-weight: 500; }
  .section { padding: 0 40px; margin-bottom: 32px; page-break-inside: avoid; }
  .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #003366; padding: 0 0 12px 18px; border-left: 5px solid #E3007E; margin-bottom: 18px; }
  .grid-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
  .card { padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
  .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; opacity: 0.75; margin-bottom: 8px; }
  .card-value { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .card-blue { background: #eff6ff; border-color: #bfdbfe; color: #003366; }
  .card-green { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
  .card-orange { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }
  .card-red { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
  .card-pink { background: #fdf2f8; border-color: #fbcfe8; color: #be185d; }
  .card-dark { background: linear-gradient(135deg, #003366, #0054A6); border-color: #003366; color: #fff; }
  .card-dark .card-label { opacity: 0.85; }
  .info-box { background: #f8fafc; border-left: 4px solid #003366; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #475569; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.small { font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #475569; font-weight: 800; border-bottom: 2px solid #cbd5e1; }
  td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  td.tr, th.tr { text-align: right; }
  td.tg { color: #16a34a; font-weight: 700; }
  td.tr-red { color: #dc2626; font-weight: 700; }
  .empty { color: #94a3b8; font-style: italic; padding: 12px; text-align: center; }
  .delta { color: #64748b; font-size: 10px; font-weight: 600; }
  .pie-row { display: flex; gap: 32px; align-items: center; padding: 16px; background: #f8fafc; border-radius: 12px; }
  .pie-legend { flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
  .legend-item { padding: 10px 14px; background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .legend-val { color: #64748b; font-size: 11px; }
  .bars { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 140px 1fr 110px; align-items: center; gap: 12px; font-size: 12px; }
  .bar-label { font-weight: 700; color: #1e293b; }
  .bar-track { height: 22px; background: #f1f5f9; border-radius: 8px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 8px; transition: width 0.3s; }
  .bar-green { background: linear-gradient(90deg, #10b981, #059669); }
  .bar-amber { background: linear-gradient(90deg, #f59e0b, #d97706); }
  .bar-value { text-align: right; font-weight: 700; color: #003366; }
  .footer { padding: 24px 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 2px solid #f1f5f9; margin-top: 32px; }
  @media print { .section { page-break-inside: avoid; } .hero { page-break-after: avoid; } }
`;

export const buildReportHTML = (data: ReportData, pdfFilename: string): string => {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Marguel ${PERIOD_LABELS[data.period]}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>${buildStyles()}
    #loading { position: fixed; inset: 0; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; }
    #loading p { color: #003366; font-weight: 900; font-size: 14px; margin-top: 16px; letter-spacing: 2px; text-transform: uppercase; }
    .spinner { width: 48px; height: 48px; border: 5px solid #e2e8f0; border-top-color: #E3007E; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="report-content">
    ${buildHeader(data.period, data.startStr, data.endStr)}
    ${buildSummary(data)}
    ${buildSalesSection(data)}
    ${buildPurchasesSection(data)}
    ${buildExpensesSection(data)}
    ${buildFinanceSection(data)}
    ${buildStockSection(data)}
    ${buildAuditSection(data)}
    <div class="footer">
      Gerado em ${new Date().toLocaleString('pt-AO')} por ${escapeHtml(data.generatedBy)}<br/>
      Marguel Sistema de Gestão Interna &copy; ${new Date().getFullYear()}
    </div>
  </div>
  <div id="loading"><div class="spinner"></div><p>A gerar PDF...</p></div>
  <script>
    window.addEventListener('load', function() {
      var element = document.getElementById('report-content');
      var opt = { margin: [10, 0, 10, 0], filename: ${JSON.stringify(pdfFilename)}, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
      html2pdf().set(opt).from(element).save().then(function() { document.getElementById('loading').style.display = 'none'; window.close(); });
    });
  </script>
</body>
</html>`;
};
