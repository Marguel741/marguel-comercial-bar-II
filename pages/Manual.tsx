import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Edit3, Save, X, Plus, Trash2, CheckCircle, XCircle,
  HelpCircle, AlertTriangle, Info, ArrowRight, Check, EyeOff, Eye,
  LayoutDashboard, MonitorPlay, ShoppingCart, CalendarRange, Package,
  DollarSign, Wallet, BarChart3, History, Settings, Users, LogIn, UserPlus,
  Clock, Shield, Sparkles, ChevronLeft, Trophy, RotateCcw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { db } from '../src/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { generateUUID } from '../src/utils';
import { ManualSection } from '../types';

// ─── Tamanho de letra ─────────────────────────────────────────────────────────
const FS_KEY = 'mg_manual_fontsize';

// ─── Mapa de ícones ───────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.FC<any>> = {
  UserPlus, LogIn, Clock, Shield, LayoutDashboard, MonitorPlay, ShoppingCart,
  CalendarRange, Package, DollarSign, Wallet, BarChart3, History, Settings,
  Users, BookOpen, Sparkles,
};

// ─── Gradientes por secção ────────────────────────────────────────────────────
const SECTION_COLORS: Record<string, string> = {
  sec_register:  'from-violet-500 to-purple-600',
  sec_login:     'from-blue-500 to-blue-700',
  sec_pending:   'from-amber-400 to-orange-500',
  sec_banned:    'from-red-500 to-rose-600',
  sec_dashboard: 'from-[#003366] to-[#0054A6]',
  sec_direct:    'from-teal-500 to-emerald-600',
  sec_sales:     'from-[#003366] to-indigo-700',
  sec_calendar:  'from-sky-500 to-cyan-600',
  sec_inventory: 'from-green-500 to-emerald-700',
  sec_prices:    'from-yellow-500 to-amber-600',
  sec_expenses:  'from-orange-500 to-red-500',
  sec_account:   'from-[#003366] to-slate-700',
  sec_audit:     'from-slate-600 to-slate-800',
  sec_users:     'from-indigo-500 to-violet-600',
  sec_settings:  'from-slate-500 to-slate-700',
  sec_manual:    'from-[#E3007E] to-pink-600',
  sec_novidades: 'from-fuchsia-500 to-pink-600',
};

// ─── Mockups visuais ──────────────────────────────────────────────────────────
const SECTION_MOCKUPS: Record<string, React.FC> = {
  sec_dashboard: () => (
    <div className="bg-[#001A33] rounded-2xl p-4 space-y-3 select-none">
      <div className="flex gap-2">
        {[['Total Vendido','142.500 Kz','text-green-400'],['Levantado','130.000 Kz','text-blue-400'],['Divergência','-12.500 Kz','text-red-400']].map(([l,v,c])=>(
          <div key={l} className="flex-1 bg-white/5 rounded-xl p-2.5">
            <p className="text-[8px] text-white/40 uppercase">{l}</p>
            <p className={`text-xs font-black mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 rounded-xl p-3">
        <p className="text-[8px] text-white/40 uppercase mb-2">Despesas do Mês</p>
        <div className="flex items-end gap-1 h-10">
          {[60,40,80,55,90,45,70,60,85,40,65,75].map((h,i)=>(
            <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:`hsl(${320+i*5},80%,55%)`}} />
          ))}
        </div>
      </div>
      <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
        <p className="text-[9px] text-red-300">⚠️ 3 produtos em stock crítico</p>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        <p className="text-[9px] text-amber-300">🔔 Fecho de 02/06 aguarda confirmação</p>
      </div>
    </div>
  ),
  sec_direct: () => (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 space-y-2.5 select-none">
      <div className="bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 border border-slate-200 dark:border-slate-600">🔍 Pesquisar produto...</div>
      <div className="grid grid-cols-3 gap-1.5">
        {[['🍺','Cuca','300 Kz'],['🥤','Sumol','500 Kz'],['💧','Água','100 Kz'],['🍷','Vinho','200 Kz'],['⚡','Speed','400 Kz'],['🍺','Nocal','300 Kz']].map(([e,n,p])=>(
          <div key={n} className="bg-white dark:bg-slate-700 rounded-xl p-2 text-center border border-slate-200 dark:border-slate-600">
            <p className="text-base">{e}</p>
            <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200 mt-0.5 truncate">{n}</p>
            <p className="text-[8px] text-[#E3007E] font-bold">{p}</p>
            <div className="mt-1 bg-[#003366] rounded-md py-0.5 text-[8px] text-white font-bold">+</div>
          </div>
        ))}
      </div>
      <div className="bg-[#003366] rounded-xl p-2.5 flex items-center justify-between">
        <div><p className="text-[8px] text-white/50">Carrinho • 2 itens</p><p className="text-xs font-black text-white">800 Kz</p></div>
        <div className="bg-[#E3007E] px-3 py-1.5 rounded-lg text-[9px] text-white font-black">Cobrar →</div>
      </div>
    </div>
  ),
  sec_sales: () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 select-none">
      <div className="bg-[#003366] px-3 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-white">Controle de Vendas — 02/06/2026</p>
        <div className="bg-amber-400/20 px-2 py-0.5 rounded text-[8px] text-amber-300 font-bold border border-amber-400/30">PARCIAL</div>
      </div>
      <div className="grid grid-cols-5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-[8px] font-bold text-slate-400 uppercase">
        <span className="col-span-2">Produto</span><span className="text-center">Ini.</span><span className="text-center">Vend.</span><span className="text-right">Receita</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {[['🍺 Cuca','48','12','3.600 Kz'],['🥤 Sumol','24','8','4.000 Kz'],['🍺 Nocal','36','15','4.500 Kz']].map(([n,i,v,r])=>(
          <div key={n} className="grid grid-cols-5 items-center px-3 py-2 text-[9px]">
            <span className="col-span-2 font-medium text-slate-700 dark:text-slate-200 truncate">{n}</span>
            <span className="text-center text-slate-400">{i}</span>
            <span className="text-center font-black text-[#E3007E]">{v}</span>
            <span className="text-right font-bold text-green-600">{r}</span>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
        <div><p className="text-[8px] text-slate-400">Total Esperado</p><p className="text-sm font-black text-slate-800 dark:text-white">24.000 Kz</p></div>
        <div className="bg-[#003366] px-3 py-2 rounded-xl text-[9px] text-white font-black">Submeter Fecho →</div>
      </div>
    </div>
  ),
  sec_calendar: () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 select-none">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black text-slate-700 dark:text-white">Junho 2026</p>
        <div className="flex gap-2">
          {[['bg-green-500','OK'],['bg-yellow-400','Parcial'],['bg-slate-300','—']].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${c}`}/><span className="text-[8px] text-slate-400">{l}</span></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} className="text-center text-[7px] text-slate-400 font-bold pb-0.5">{d}</div>)}
        <div/><div/>
        {Array.from({length:30},(_,i)=>i+1).map(d=>{
          const c = d < 28 ? (d%5===0?'bg-yellow-400 text-slate-800':'bg-green-500 text-white') : 'bg-slate-100 dark:bg-slate-700 text-slate-400';
          return <div key={d} className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-bold ${c}`}>{d}</div>;
        })}
      </div>
    </div>
  ),
  sec_inventory: () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 select-none">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex gap-1.5">
        {[['Todos','bg-[#003366] text-white'],['Críticos','bg-red-100 text-red-600'],['Baixos','bg-yellow-100 text-yellow-600'],['OK','bg-green-100 text-green-600']].map(([l,c])=>(
          <span key={l} className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${c}`}>{l}</span>
        ))}
      </div>
      {[['Cuca','🍺',8,24,'text-red-500','bg-red-400'],['Sumol','🥤',18,24,'text-yellow-500','bg-yellow-400'],['Nocal','🍺',42,24,'text-green-600','bg-green-500'],['Água','💧',55,24,'text-green-600','bg-green-500']].map(([n,e,s,m,tc,bc])=>(
        <div key={n as string} className="flex items-center px-3 py-2 gap-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
          <span className="text-base">{e}</span>
          <div className="flex-1">
            <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200">{n as string}</p>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1 mt-1">
              <div className={`h-1 rounded-full ${bc}`} style={{width:`${Math.min(100,((s as number)/(m as number))*100)}%`}}/>
            </div>
          </div>
          <span className={`text-xs font-black ${tc}`}>{s as number}</span>
        </div>
      ))}
    </div>
  ),
  sec_account: () => (
    <div className="space-y-2 select-none">
      {[['Conta Bancária','from-[#003366] to-[#0054A6]','245.800 Kz','+142.500','-38.200'],['Em Mão','from-emerald-600 to-teal-700','18.500 Kz','+24.000','-5.500'],['Marguel Reserve','from-yellow-500 to-amber-600','580.000 Kz','+50.000','—']].map(([n,g,b,e,s])=>(
        <div key={n} className={`bg-gradient-to-r ${g} rounded-2xl p-3 text-white`}>
          <div className="flex items-start justify-between">
            <div><p className="text-[8px] text-white/50 uppercase tracking-widest">{n}</p><p className="text-base font-black mt-0.5">{b}</p></div>
            <div className="text-right"><p className="text-[8px] text-green-300 font-bold">{e} Kz</p><p className="text-[8px] text-red-300 font-bold">{s} Kz</p></div>
          </div>
        </div>
      ))}
    </div>
  ),
};

// ─── Secções iniciais ─────────────────────────────────────────────────────────
const INITIAL_SECTIONS: Omit<ManualSection, 'updatedAt' | 'updatedBy'>[] = [
  { id:'sec_register', order:0, pageLabel:'Criar Conta', route:'/register', icon:'UserPlus', description:'Como criar uma conta nova no sistema Marguel SGI.', steps:[{id:'s1',text:'Acede ao site e clica em "Criar conta nova" no ecrã de login.',note:'Precisas de um endereço de email válido.'},{id:'s2',text:'Preenche o teu nome completo, email e escolhe um PIN de 4 dígitos. O PIN substitui a palavra-passe — guarda-o bem.'},{id:'s3',text:'Submete o formulário. A tua conta fica em estado "A aguardar aprovação" até um administrador a activar.'}], importantNotes:['Não consegues entrar no sistema enquanto a conta não for aprovada.','O PIN é o teu acesso — não o partilhes com ninguém.'], quiz:[{id:'q1',question:'O que acontece depois de criar a conta?',options:['Entras directamente no sistema','A conta fica a aguardar aprovação','Recebes um email de confirmação','O sistema cria automaticamente um PIN'],correctIndex:1,explanation:'Toda a conta nova precisa de aprovação por um administrador antes de poder aceder ao sistema.'}] },
  { id:'sec_login', order:1, pageLabel:'Login', route:'/login', icon:'LogIn', description:'Como entrar no sistema com a tua conta aprovada.', steps:[{id:'s1',text:'Introduz o teu email e o PIN de 4 dígitos no ecrã de login.'},{id:'s2',text:'Clica em "Entrar". Se os dados estiverem correctos, serás redirecionado para a Página Inicial.'},{id:'s3',text:'Nas Definições podes activar a biometria (impressão digital / Face ID) para entrar mais rapidamente.',note:'A biometria fica guardada apenas no dispositivo actual.'}], importantNotes:['Se a conta ainda não foi aprovada, serás redirecionado para a página de aprovação pendente.','Se a conta foi banida, verás uma mensagem de acesso negado.'], quiz:[{id:'q1',question:'Qual é a palavra-passe usada no Marguel SGI?',options:['Uma password de texto','Um PIN de 4 dígitos','Um código QR','O número de telefone'],correctIndex:1,explanation:'O sistema usa um PIN de 4 dígitos em vez de uma password tradicional.'}] },
  { id:'sec_pending', order:2, pageLabel:'A Aguardar Aprovação', route:'/pending-approval', icon:'Clock', description:'O que acontece enquanto a conta está a aguardar aprovação.', steps:[{id:'s1',text:'Depois de criar conta, és redirecionado automaticamente para esta página.'},{id:'s2',text:'Um administrador ou proprietário irá aprovar a tua conta na página de Utilizadores.'},{id:'s3',text:'Quando a conta for aprovada, poderás entrar normalmente com o teu email e PIN.'}], importantNotes:['Não há prazo definido — depende de quando um admin aceder ao sistema.','Não precisas de criar outra conta enquanto esperas.'], quiz:[{id:'q1',question:'O que deves fazer enquanto a conta está pendente?',options:['Criar outra conta','Aguardar que um administrador aprove','Contactar o suporte técnico','Redefinir o PIN'],correctIndex:1,explanation:'Basta aguardar. Um administrador irá aprovar a conta na página de Utilizadores.'}] },
  { id:'sec_banned', order:3, pageLabel:'Conta Banida', route:'/banned', icon:'Shield', description:'O que significa ter a conta banida e como resolver.', steps:[{id:'s1',text:'Se a tua conta foi banida, verás esta mensagem ao tentar entrar no sistema.'},{id:'s2',text:'O ban é aplicado por um administrador ou proprietário na página de Utilizadores.'},{id:'s3',text:'Para resolver a situação, contacta directamente o proprietário do estabelecimento.'}], importantNotes:['Uma conta banida não pode aceder a nenhuma parte do sistema.','Apenas o PROPRIETARIO ou ADMIN_GERAL pode remover o ban.'], quiz:[{id:'q1',question:'Quem pode remover o ban de uma conta?',options:['O próprio utilizador','Qualquer colaborador','PROPRIETARIO ou ADMIN_GERAL','O sistema automaticamente após 24h'],correctIndex:2,explanation:'Apenas o PROPRIETARIO ou ADMIN_GERAL tem permissão para banir e desbanir contas.'}] },
  { id:'sec_dashboard', order:4, pageLabel:'Página Inicial', route:'/', icon:'LayoutDashboard', description:'Visão geral do negócio — vendas de ontem, stock crítico, alertas e notificações.', steps:[{id:'s1',text:'A Página Inicial mostra SEMPRE os dados de ontem — nunca de hoje. As vendas de hoje só aparecem amanhã, depois do fecho ser confirmado.',note:'Isto é intencional. As vendas são registadas na manhã seguinte ao turno.'},{id:'s2',text:'"Total Vendido" = receita esperada pelos preços × quantidades. "Total Levantado" = dinheiro físico contado no final do turno.'},{id:'s3',text:'"Divergência" = diferença entre o esperado e o levantado. 🟢 Verde = dinheiro a mais. 🔴 Vermelho = dinheiro em falta.'},{id:'s4',text:'Os alertas de stock mostram produtos em nível crítico (vermelho) ou baixo (amarelo). Clica no alerta para ir directamente ao Inventário.'},{id:'s5',text:'O gráfico de despesas mostra as categorias do mês actual. Clica no botão ⛶ para expandir em ecrã inteiro.'}], importantNotes:['Os dados mostrados são sempre do dia anterior — nunca do dia actual.','As notificações no topo são alertas internos do sistema — não são SMS nem email.'], quiz:[{id:'q1',question:'Porque é que a Página Inicial mostra dados de ontem?',options:['É um bug do sistema','As vendas são registadas no dia seguinte ao turno','O sistema está atrasado','A data do sistema está errada'],correctIndex:1,explanation:'O fluxo do bar regista as vendas na manhã seguinte. Por isso a dashboard mostra sempre o dia anterior.'},{id:'q2',question:'O que significa divergência a verde?',options:['Dinheiro em falta','Stock a zero','Dinheiro a mais do que o esperado','Sistema offline'],correctIndex:2,explanation:'Verde = sobra de caixa. Vermelho = quebra de caixa.'}] },
  { id:'sec_direct', order:5, pageLabel:'Atendimento Directo', route:'/direct-service', icon:'MonitorPlay', description:'Registo de vendas avulsas em tempo real — fora do fecho normal diário.', steps:[{id:'s1',text:'Usa esta página para registar vendas pontuais durante o turno — por exemplo, uma mesa que pede uma bebida avulsa.'},{id:'s2',text:'Pesquisa o produto pelo nome ou filtra por categoria. Clica em "+ Adicionar" para incluir no carrinho.'},{id:'s3',text:'Se um produto faz parte de um Mix&Match, o desconto é aplicado automaticamente ao atingir a quantidade mínima.',note:'O Mix&Match é configurado em Preços & Compras.'},{id:'s4',text:'No checkout escolhe o método de pagamento: 💵 Dinheiro, 💳 TPA ou 📲 Transferência. Depois clica em "Cobrar".'},{id:'s5',text:'A venda fica guardada no histórico e sincroniza com o servidor automaticamente quando há ligação.'}], importantNotes:['⚠️ O Atendimento Directo NÃO afecta o stock — é apenas um registo financeiro.','As vendas ficam primeiro no dispositivo (offline) e sincronizam depois — nunca se perdem.','Não substitui o fecho diário normal do Controle de Vendas.'], quiz:[{id:'q1',question:'O Atendimento Directo afecta o stock?',options:['Sim, deduz automaticamente','Não, é apenas um registo financeiro','Só afecta se confirmarmos no fecho','Depende do produto'],correctIndex:1,explanation:'O Atendimento Directo regista a venda mas não toca no stock. O stock só é actualizado no Fecho Confirmado.'},{id:'q2',question:'O que acontece a uma venda feita sem ligação à internet?',options:['Perde-se','Fica guardada no dispositivo e sincroniza depois','É cancelada automaticamente','Aparece a vermelho e não conta'],correctIndex:1,explanation:'O sistema guarda a venda localmente e sincroniza com o servidor quando a ligação é restaurada.'}] },
  { id:'sec_sales', order:6, pageLabel:'Controle de Vendas', route:'/sales', icon:'ShoppingCart', description:'O coração do sistema — registo do fecho diário com dois níveis de confirmação.', steps:[{id:'s1',text:'1️⃣ FECHO PARCIAL — feito pelo gerente ou funcionário com permissão. Selecciona a data do turno (normalmente ontem) e preenche as quantidades vendidas.'},{id:'s2',text:'O sistema calcula automaticamente: stock final esperado, quantidade vendida e receita esperada por produto.'},{id:'s3',text:'No resumo financeiro indica quanto foi levantado em 💵 Dinheiro, 💳 TPA e 📲 Transferência. Submete o "Fecho Parcial".',note:'Neste momento o stock ainda NÃO foi deduzido.'},{id:'s4',text:'2️⃣ FECHO CONFIRMADO — feito por um segundo utilizador (ADMIN ou PROPRIETARIO). Revê os dados e clica em "Confirmar Fecho".'},{id:'s5',text:'Ao confirmar: ✅ stock deduzido, ✅ TPA/Transferência vai para Conta Bancária, ✅ dinheiro em espécie vai para Em Mão, ✅ relatório bloqueado.'}], importantNotes:['O stock SÓ é deduzido no Fecho CONFIRMADO — nunca no Fecho Parcial.','São sempre necessários DOIS utilizadores diferentes para completar o fecho.','Após confirmação, o relatório fica bloqueado para edição.'], quiz:[{id:'q1',question:'Quando é que o stock é deduzido?',options:['Ao submeter o Fecho Parcial','Ao confirmar o Fecho Confirmado','No dia seguinte automaticamente','Quando o admin faz login'],correctIndex:1,explanation:'O stock só é processado no Fecho Confirmado. O Fecho Parcial apenas regista os dados.'},{id:'q2',question:'Onde vai o dinheiro levantado em TPA?',options:['Em Mão','Marguel Reserve','Conta Bancária','Fica em espera'],correctIndex:2,explanation:'TPA e Transferência vão para a Conta Bancária. Dinheiro em espécie vai para o cartão Em Mão.'},{id:'q3',question:'Quem pode fazer o Fecho Confirmado?',options:['Qualquer utilizador','Só o FUNCIONARIO','ADMIN_GERAL ou PROPRIETARIO','O sistema automaticamente'],correctIndex:2,explanation:'A confirmação final requer permissão de ADMIN_GERAL ou PROPRIETARIO.'}] },
  { id:'sec_calendar', order:7, pageLabel:'Calendário Marguel', route:'/calendar', icon:'CalendarRange', description:'Vista mensal dos fechos — histórico, divergências, bloqueios e relatórios PDF.', steps:[{id:'s1',text:'O calendário mostra todos os dias coloridos: 🟢 Verde = fecho confirmado, 🟡 Amarelo = fecho parcial pendente, ⚪ Cinzento = sem registo.'},{id:'s2',text:'Clica num dia para ver os detalhes: total vendido, total levantado, divergência e estado do fecho.'},{id:'s3',text:'No painel do dia podes gerar um 📄 relatório PDF completo com todos os dados desse fecho.'},{id:'s4',text:'O ADMIN pode 🔒 bloquear um dia para impedir qualquer edição retroactiva.'},{id:'s5',text:'Para desbloquear é necessária permissão especial e um motivo — fica registado na Auditoria.'}], importantNotes:['"Dinheiro a mais" = foi levantado mais do que o esperado pelas vendas.','"Dinheiro em falta" = faltou dinheiro em relação ao total esperado.','Bloquear um dia é irreversível sem permissão de admin.'], quiz:[{id:'q1',question:'O que significa um dia a amarelo no calendário?',options:['Fecho confirmado','Fecho parcial — ainda não confirmado','Dia bloqueado','Sem registo de vendas'],correctIndex:1,explanation:'Amarelo = Fecho Parcial submetido mas ainda aguarda confirmação do segundo utilizador.'}] },
  { id:'sec_inventory', order:8, pageLabel:'Inventário', route:'/inventory', icon:'Package', description:'Gestão completa de produtos, stock actual, categorias e equipamentos.', steps:[{id:'s1',text:'A lista mostra o stock actual com indicador: 🟢 Verde = OK, 🟡 Amarelo = baixo, 🔴 Vermelho = crítico (abaixo do mínimo).'},{id:'s2',text:'Usa os filtros no topo para ver apenas produtos Críticos, Baixos ou todos.'},{id:'s3',text:'Clica num produto para editar: nome, preço de venda, preço de custo, stock mínimo, packSize.'},{id:'s4',text:'Podes fazer um ajuste manual de stock com justificação — por exemplo após contagem física.',note:'Todos os ajustes ficam registados na Auditoria com data e responsável.'},{id:'s5',text:'A secção Equipamentos mostra mesas, cadeiras, grades e outros itens físicos. Actualiza as quantidades após contagem.'}], importantNotes:['O stock reflecte o estado após o último Fecho Confirmado + ajustes manuais.','O packSize (unidades por embalagem) é crítico — afecta todos os cálculos.'], quiz:[{id:'q1',question:'Um produto a vermelho no Inventário significa:',options:['Produto eliminado','Stock em nível crítico (abaixo do mínimo)','Preço desactualizado','Produto sem categoria'],correctIndex:1,explanation:'Vermelho = stock abaixo do mínimo definido. O sistema gera automaticamente um alerta na Página Inicial.'}] },
  { id:'sec_prices', order:9, pageLabel:'Preços & Compras', route:'/prices', icon:'DollarSign', description:'Gestão de preços, Mix&Match, simulador e central de compras.', steps:[{id:'s1',text:'A tabela mostra o preço de venda e o preço de custo de cada produto. Clica no valor para editar.'},{id:'s2',text:'O Mix&Match permite criar promoções: ex. "2 Cucas + 1 Sumol = 900 Kz". Activa-se automaticamente no Atendimento Directo.'},{id:'s3',text:'O Simulador de Propostas calcula o custo total de uma compra antes de a confirmar.'},{id:'s4',text:'Na Central de Compras, regista as compras reais. Podes dividir entre 🏪 Bar (imediato) e 📦 Reserva (guardado).'},{id:'s5',text:'Escolhe se o pagamento sai da 🏦 Conta Bancária ou 💵 Em Mão. O valor é debitado automaticamente.'}], importantNotes:['Alterar um preço fica registado no histórico com data e responsável.','O packSize é crítico — nunca o alteres sem ter a certeza.'], quiz:[{id:'q1',question:'O que é o Mix&Match?',options:['Um relatório de vendas misto','Uma promoção de combinação de produtos','Uma forma de transferir stock','Um tipo de fecho de caixa'],correctIndex:1,explanation:'Mix&Match é uma promoção que combina produtos. Aplica-se automaticamente no Atendimento Directo.'}] },
  { id:'sec_expenses', order:10, pageLabel:'Despesas', route:'/expenses', icon:'Wallet', description:'Registo e histórico completo de todas as despesas do estabelecimento.', steps:[{id:'s1',text:'Clica em "Nova Despesa" e preenche: título, valor, categoria, data e nota opcional.'},{id:'s2',text:'Escolhe de onde sai o dinheiro: 🏦 Conta Bancária ou 💵 Em Mão. O saldo é debitado automaticamente.'},{id:'s3',text:'Podes anexar fotos de facturas ou comprovativos directamente no formulário.'},{id:'s4',text:'O histórico mostra despesas e também compras de stock (só leitura) — visão completa de todas as saídas.',note:'A despesa de almoço diário é criada automaticamente no Fecho Confirmado.'}], importantNotes:['Eliminar uma despesa cria um ESTORNO — o valor volta ao cartão. O histórico mantém-se completo.','A despesa de almoço aparece automaticamente — não precisas de a registar manualmente.'], quiz:[{id:'q1',question:'O que acontece quando eliminas uma despesa?',options:['É apagada permanentemente','Fica marcada como inactiva','É criado um estorno e o valor volta ao cartão','Nada — não se pode eliminar'],correctIndex:2,explanation:'Por segurança, eliminar uma despesa cria um registo de estorno. O histórico mantém-se sempre completo.'}] },
  { id:'sec_account', order:11, pageLabel:'Estado da Conta', route:'/account', icon:'BarChart3', description:'Gestão dos 3 cartões financeiros, saldos, transferências e histórico de movimentos.', steps:[{id:'s1',text:'Há três cartões: 🏦 Conta Bancária (recebe TPA e transferências), 💵 Em Mão (dinheiro físico) e 🏆 Marguel Reserve (poupança).'},{id:'s2',text:'Cada cartão mostra o saldo actual. Clica para ver o histórico detalhado de movimentos.'},{id:'s3',text:'Usa "Transferência entre cartões" para mover saldo — ex: passar dinheiro de Em Mão para a Conta Bancária.'},{id:'s4',text:'O histórico mostra cada movimento com o saldo após o movimento — como um extracto bancário real.'}], importantNotes:['Os saldos actualizam-se automaticamente com cada fecho, despesa ou compra.','Não é possível eliminar transacções — apenas criar estornos.'], quiz:[{id:'q1',question:'Onde vai o dinheiro em espécie levantado no fecho?',options:['Conta Bancária','Marguel Reserve','Em Mão','Fica em espera'],correctIndex:2,explanation:'O dinheiro físico vai para o cartão Em Mão. TPA e transferências vão para a Conta Bancária.'}] },
  { id:'sec_audit', order:12, pageLabel:'Auditoria Global', route:'/audit', icon:'History', description:'Registo imutável de todas as acções críticas realizadas no sistema.', steps:[{id:'s1',text:'A Auditoria mostra os últimos 200 registos: fechos, ajustes de stock, alterações de preços, logins, etc.'},{id:'s2',text:'Cada registo tem: data/hora exacta, utilizador responsável, módulo e descrição detalhada.'},{id:'s3',text:'Filtra por módulo (VENDAS, STOCK, FINANCEIRO...) para encontrar acções específicas.'}], importantNotes:['A Auditoria é IMUTÁVEL por defeito — os registos não podem ser apagados.','Qualquer acção sensível fica aqui registada automaticamente.'], quiz:[{id:'q1',question:'Quantos registos mostra a Auditoria de cada vez?',options:['50','100','200','Todos ilimitados'],correctIndex:2,explanation:'A Auditoria carrega os últimos 200 registos para não sobrecarregar o sistema.'}] },
  { id:'sec_users', order:13, pageLabel:'Utilizadores', route:'/users', icon:'Users', description:'Gestão completa de contas: aprovação, permissões, cargos e bans.', steps:[{id:'s1',text:'A lista mostra todos os utilizadores com o seu estado: ✅ aprovado, ⏳ pendente, 🚫 banido.'},{id:'s2',text:'Clica num utilizador para: aprovar a conta, editar permissões individuais, alterar o cargo ou aplicar um ban.'},{id:'s3',text:'Cada permissão pode ser activada ou desactivada individualmente.'},{id:'s4',text:'Ao alterar permissões, o sistema envia uma notificação automática ao utilizador com o que mudou.',note:'Dois utilizadores NUNCA podem ser eliminados: dono@marguel.com e admin@marguel.com.'}], importantNotes:['dono@marguel.com e admin@marguel.com são protegidos — não podem ser eliminados.','Ao aprovar um utilizador, ele pode entrar imediatamente com o seu email e PIN.'], quiz:[{id:'q1',question:'O que acontece quando aprovamos um utilizador?',options:['Ele recebe um email automático','Pode entrar imediatamente com o seu PIN','O sistema cria um PIN aleatório','Tem de criar a conta de novo'],correctIndex:1,explanation:'Ao ser aprovado, o utilizador entra directamente com o email e PIN que registou.'}] },
  { id:'sec_settings', order:14, pageLabel:'Definições', route:'/settings', icon:'Settings', description:'Configurações pessoais: biometria, tema, data do sistema e diagnóstico.', steps:[{id:'s1',text:'Activa a 👆 biometria para entrar com impressão digital ou Face ID — sem precisar de inserir o PIN.'},{id:'s2',text:'Alterna entre tema ☀️ claro e 🌙 escuro conforme a tua preferência.'},{id:'s3',text:'A secção de Diagnóstico mostra o estado da ligação ao Firestore e a versão actual do sistema.'},{id:'s4',text:'A data do sistema pode ser alterada aqui por ADMIN para corrigir registos históricos.',note:'Alterar a data do sistema afecta todos os novos registos criados a partir desse momento.'}], importantNotes:['A biometria fica guardada APENAS no dispositivo — tens de activar em cada dispositivo separadamente.'], quiz:[{id:'q1',question:'A biometria activada funciona em qualquer dispositivo?',options:['Sim, em qualquer dispositivo','Não, fica guardada apenas no dispositivo onde foi activada','Só em Android','Só se estiver online'],correctIndex:1,explanation:'A biometria usa dados locais do dispositivo. Tens de activar separadamente em cada dispositivo.'}] },
  { id:'sec_manual', order:15, pageLabel:'Manual de Uso', route:'/manual', icon:'BookOpen', description:'Como usar este próprio Manual — navegação, quiz e edição de conteúdo.', steps:[{id:'s1',text:'O menu lateral (desktop) ou os chips horizontais (mobile) mostram todas as secções. Clica numa para a ver isolada.'},{id:'s2',text:'Cada secção tem: pré-visualização visual da página, passos numerados, notas importantes e quiz.'},{id:'s3',text:'Responde ao quiz — verás imediatamente ✅ verde (acerto) ou ❌ vermelho (erro) com explicação.'},{id:'s4',text:'Se fores PROPRIETARIO ou ADMIN_GERAL, o botão ✏️ permite editar texto, imagens, vídeos e quiz.',note:'As edições guardam-se no Firestore — visíveis para todos imediatamente.'}], importantNotes:['Podes ocultar secções sem as eliminar — usa o botão 👁 no canto da secção.','Secções eliminadas por engano são repostas automaticamente pelo sistema.'], quiz:[{id:'q1',question:'Quem pode editar o conteúdo do Manual?',options:['Qualquer utilizador','Apenas o PROPRIETARIO','PROPRIETARIO e ADMIN_GERAL','Ninguém'],correctIndex:2,explanation:'Apenas o PROPRIETARIO e ADMIN_GERAL têm o botão de edição disponível.'}] },
  { id:'sec_novidades', order:16, pageLabel:'O que há de novo', route:'/novidades', icon:'Sparkles', description:'Como funcionam as novidades, o changelog e o sistema de notificação.', steps:[{id:'s1',text:'Sempre que há uma nova versão, aparece um ✨ pop-up automático ao entrar com a lista de novidades.'},{id:'s2',text:'O ícone "O que há de novo" no menu mostra um 🔴 badge enquanto há versões que ainda não viste.'},{id:'s3',text:'Cada entrada tem: versão, data, título e lista por categoria — 🐛 Correcção, ⚡ Melhoria, ⭐ Nova funcionalidade.'},{id:'s4',text:'Se fores PROPRIETARIO ou ADMIN_GERAL, clica em "Nova entrada" para publicar novidades.'}], importantNotes:['O pop-up só aparece UMA vez por versão — o registo fica guardado no Firestore.','O badge desaparece ao entrar na página "O que há de novo".'], quiz:[{id:'q1',question:'O pop-up de novidades volta ao reabrir o site?',options:['Sim, sempre','Não, só aparece uma vez por versão nova','Só se limparmos o cache','Depende do cargo'],correctIndex:1,explanation:'O sistema guarda no Firestore quais versões cada utilizador já viu. O pop-up só aparece para versões novas.'}] },
];

// ─── Componente principal ─────────────────────────────────────────────────────
const Manual: React.FC = () => {
  const { user } = useAuth();
  const { sidebarMode } = useLayout();
  const { addAuditLog } = useProducts();
  const canEdit = user?.role === 'PROPRIETARIO' || user?.role === 'ADMIN_GERAL';

  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<string,number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<string,boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<ManualSection|null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id:string;label:string}|null>(null);
  const [fontSizeIdx, setFontSizeIdx] = useState<number>(() => parseInt(localStorage.getItem(FS_KEY)||'1'));
  const [toast, setToast] = useState<{show:boolean;message:string;type:'success'|'error'}>({show:false,message:'',type:'success'});

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({show:true,message,type});
    setTimeout(()=>setToast({show:false,message:'',type:'success'}),3000);
  };
  const changeFontSize = (idx: number) => { setFontSizeIdx(idx); localStorage.setItem(FS_KEY,String(idx)); };
  const fontClass = ['text-sm','text-base','text-lg'][fontSizeIdx];

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,'appdata/manual/sections'), snap=>{
      const existing = snap.docs.map(d=>d.data() as ManualSection);
      const existingIds = new Set(existing.map(s=>s.id));
      INITIAL_SECTIONS.forEach(s=>{ if(!existingIds.has(s.id)) setDoc(doc(db,'appdata/manual/sections',s.id),{...s,updatedAt:Date.now(),updatedBy:'Sistema (reposto)'}); });
      const sorted = existing.sort((a,b)=>a.order-b.order);
      setSections(sorted);
      if(!activeId && sorted.length>0) setActiveId(sorted.find(s=>!(s as any).isHidden)?.id||sorted[0].id);
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{ if(user) addAuditLog({action:'ACESSO_PAGINA' as any,module:'SISTEMA',description:`${user.name} acedeu ao Manual de Uso.`}); },[]);

  const activeSection = sections.find(s=>s.id===activeId)||null;
  const visibleSections = sections.filter(s=>canEdit||!(s as any).isHidden);

  const handleQuizAnswer = (secId:string,qId:string,idx:number)=>{
    const key=`${secId}_${qId}`;
    if(quizRevealed[key]) return;
    setQuizAnswers(p=>({...p,[key]:idx}));
    setQuizRevealed(p=>({...p,[key]:true}));
  };
  const quizScore = (sec:ManualSection)=>{
    const total=sec.quiz.length; if(!total) return null;
    const correct=sec.quiz.filter(q=>quizAnswers[`${sec.id}_${q.id}`]===q.correctIndex&&quizRevealed[`${sec.id}_${q.id}`]).length;
    const answered=sec.quiz.filter(q=>quizRevealed[`${sec.id}_${q.id}`]).length;
    return {correct,answered,total};
  };
  const resetQuiz = (sec:ManualSection)=>{
    const a={...quizAnswers},r={...quizRevealed};
    sec.quiz.forEach(q=>{delete a[`${sec.id}_${q.id}`];delete r[`${sec.id}_${q.id}`];});
    setQuizAnswers(a);setQuizRevealed(r);
  };
  const toggleHide = async(sec:ManualSection)=>{
    const up={...sec,isHidden:!(sec as any).isHidden};
    await setDoc(doc(db,'appdata/manual/sections',sec.id),up);
    showToast((up as any).isHidden?`"${sec.pageLabel}" ocultada.`:`"${sec.pageLabel}" visível.`);
  };
  const confirmDelete = async()=>{
    if(!deleteConfirm) return;
    await deleteDoc(doc(db,'appdata/manual/sections',deleteConfirm.id));
    addAuditLog({action:'REMOVER_SECCAO_MANUAL' as any,module:'SISTEMA',entityId:deleteConfirm.id,description:`Secção "${deleteConfirm.label}" eliminada.`});
    showToast(`"${deleteConfirm.label}" eliminada.`);
    setDeleteConfirm(null);
    const remaining=sections.filter(s=>s.id!==deleteConfirm.id&&!(s as any).isHidden);
    if(remaining.length>0&&activeId===deleteConfirm.id) setActiveId(remaining[0].id);
  };
  const startEdit=(sec:ManualSection)=>{ setEditingSection(JSON.parse(JSON.stringify(sec)));setIsEditing(true); };
  const saveSection=async()=>{
    if(!editingSection) return;
    const up={...editingSection,updatedAt:Date.now(),updatedBy:user?.name||'Admin'};
    await setDoc(doc(db,'appdata/manual/sections',up.id),up);
    addAuditLog({action:'EDITAR_MANUAL' as any,module:'SISTEMA',entityId:up.id,description:`Secção "${up.pageLabel}" actualizada.`});
    showToast('Guardado.');setIsEditing(false);setEditingSection(null);
  };
  const addNewSection=async()=>{
    const id=`sec_${generateUUID().slice(0,8)}`;
    const maxOrder=sections.reduce((m,s)=>Math.max(m,s.order),0);
    const ns:ManualSection={id,order:maxOrder+1,pageLabel:'Nova Secção',route:'/',icon:'BookOpen',description:'Descrição desta secção.',steps:[{id:generateUUID(),text:'Passo 1',note:''}],importantNotes:[],quiz:[],updatedAt:Date.now(),updatedBy:user?.name||'Admin'};
    await setDoc(doc(db,'appdata/manual/sections',id),ns);
    startEdit(ns);
  };
  const upd=(f:keyof ManualSection,v:any)=>setEditingSection(p=>p?{...p,[f]:v}:p);

  const grad=activeSection?(SECTION_COLORS[activeSection.id]||'from-[#003366] to-[#0054A6]'):'from-[#003366] to-[#0054A6]';
  const MockupComp=activeSection?SECTION_MOCKUPS[activeSection.id]:null;
  const score=activeSection?quizScore(activeSection):null;

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#E3007E]/30 border-t-[#E3007E] rounded-full animate-spin"/></div>;

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 ${fontClass}`}>

      {/* Menu lateral desktop */}
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <BookOpen size={15} className="text-[#003366] shrink-0"/>
          <span className="font-black text-sm text-slate-800 dark:text-white truncate">Manual de Uso</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {visibleSections.map(s=>{
            const I=ICON_MAP[s.icon]||BookOpen;
            const isActive=activeId===s.id;
            return (
              <button key={s.id} onClick={()=>setActiveId(s.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${isActive?`bg-gradient-to-r ${SECTION_COLORS[s.id]||'from-[#003366] to-[#0054A6]'} text-white shadow-md`:'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${(s as any).isHidden?'opacity-40':''}`}>
                <I size={14} className="shrink-0"/>
                <span className="flex-1 truncate">{s.pageLabel}</span>
                {(s as any).isHidden&&<EyeOff size={9} className="shrink-0 opacity-60"/>}
              </button>
            );
          })}
        </div>
        {canEdit&&<div className="p-3 border-t border-slate-200 dark:border-slate-700"><button onClick={addNewSection} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-xs font-bold"><Plus size={13}/>Nova Secção</button></div>}
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <div className="w-10 shrink-0 md:hidden"/>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-slate-800 dark:text-white text-base">Manual de Uso</h1>
            {activeSection&&<p className="text-xs text-slate-400">{visibleSections.findIndex(s=>s.id===activeId)+1} / {visibleSections.length}</p>}
          </div>
          {/* Acessibilidade */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[0,1,2].map(i=>(
              <button key={i} onClick={()=>changeFontSize(i)}
                className={`w-8 h-7 rounded-lg font-black transition-all ${fontSizeIdx===i?'bg-white dark:bg-slate-700 text-[#003366] dark:text-white shadow-sm':'text-slate-400 hover:text-slate-600'}`}
                style={{fontSize:9+i*2}}>A</button>
            ))}
          </div>
          {canEdit&&<button onClick={addNewSection} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#003366] text-white text-xs font-bold whitespace-nowrap"><Plus size={13}/>Nova</button>}
        </div>

        {/* Chips mobile */}
        <div className="md:hidden shrink-0 px-4 pt-2.5 pb-1 overflow-x-auto bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-1.5 w-max pb-1">
            {visibleSections.map(s=>{
              const I=ICON_MAP[s.icon]||BookOpen;
              return (
                <button key={s.id} onClick={()=>setActiveId(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeId===s.id?`bg-gradient-to-r ${SECTION_COLORS[s.id]||'from-[#003366] to-[#0054A6]'} text-white shadow`:'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <I size={11}/>{s.pageLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo isolado da secção activa */}
        {activeSection?(
          <div className="flex-1 overflow-y-auto">
            {/* Hero */}
            <div className={`bg-gradient-to-br ${grad} px-5 pt-6 pb-8 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white translate-x-12 -translate-y-12"/>
                <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white -translate-x-8 translate-y-8"/>
              </div>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {(()=>{const I=ICON_MAP[activeSection.icon]||BookOpen;return <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0"><I size={22}/></div>;})()}
                    <div>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest">Secção {visibleSections.findIndex(s=>s.id===activeId)+1}</p>
                      <h2 className="text-xl font-black leading-tight">{activeSection.pageLabel}</h2>
                    </div>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{activeSection.description}</p>
                </div>
                {canEdit&&(
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={()=>startEdit(activeSection)} className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur transition-colors" title="Editar"><Edit3 size={14}/></button>
                    <button onClick={()=>toggleHide(activeSection)} className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur transition-colors" title={(activeSection as any).isHidden?'Tornar visível':'Ocultar'}>{(activeSection as any).isHidden?<Eye size={14}/>:<EyeOff size={14}/>}</button>
                    <button onClick={()=>setDeleteConfirm({id:activeSection.id,label:activeSection.pageLabel})} className="p-2.5 rounded-xl bg-red-400/30 hover:bg-red-400/50 backdrop-blur transition-colors" title="Eliminar"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
              {(activeSection as any).isHidden&&(
                <div className="relative z-10 mt-3 flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                  <EyeOff size={12}/><span className="text-xs">Esta secção está oculta para os outros utilizadores</span>
                </div>
              )}
            </div>

            <div className="px-4 py-5 max-w-2xl mx-auto space-y-6">

              {/* Mockup */}
              {MockupComp&&(
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-2.5">Pré-visualização</p>
                  <MockupComp/>
                </div>
              )}

              {/* Passos */}
              {activeSection.steps.length>0&&(
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-3">Passo a passo</p>
                  <div className="space-y-0">
                    {activeSection.steps.map((step,idx)=>(
                      <div key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} text-white text-xs font-black flex items-center justify-center shadow`}>{idx+1}</div>
                          {idx<activeSection.steps.length-1&&<div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1"/>}
                        </div>
                        <div className="pb-4 flex-1 pt-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step.text}</p>
                          {step.imageUrl&&<img src={step.imageUrl} alt={`Passo ${idx+1}`} className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 w-full"/>}
                          {step.videoUrl&&(
                            <div className="mt-3">{step.videoUrl.includes('youtube')||step.videoUrl.includes('youtu.be')
                              ?<iframe className="w-full rounded-2xl aspect-video" src={step.videoUrl.replace('watch?v=','embed/')} allowFullScreen title={`Vídeo ${idx+1}`}/>
                              :<video src={step.videoUrl} controls className="w-full rounded-2xl"/>}
                            </div>
                          )}
                          {step.note&&(
                            <div className="mt-2 flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2">
                              <Info size={13} className="text-amber-500 shrink-0 mt-0.5"/>
                              <p className="text-xs text-amber-700 dark:text-amber-300">{step.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas importantes */}
              {activeSection.importantNotes.length>0&&(
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2.5"><AlertTriangle size={15} className="text-red-500"/><span className="text-sm font-black text-red-700 dark:text-red-400">Importante</span></div>
                  <ul className="space-y-2">{activeSection.importantNotes.map((note,i)=>(
                    <li key={i} className="flex gap-2 text-sm text-red-700 dark:text-red-300"><ArrowRight size={14} className="shrink-0 mt-0.5"/>{note}</li>
                  ))}</ul>
                </div>
              )}

              {/* Quiz */}
              {activeSection.quiz.length>0&&(
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className={`bg-gradient-to-r ${grad} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2 text-white"><HelpCircle size={15}/><span className="text-sm font-black">Teste o seu conhecimento</span></div>
                    {score&&score.answered>0&&(
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/80 font-bold">{score.correct}/{score.total}</span>
                        <button onClick={()=>resetQuiz(activeSection)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Recomeçar"><RotateCcw size={12} className="text-white"/></button>
                      </div>
                    )}
                  </div>
                  {score&&score.answered>0&&(
                    <div className="px-4 pt-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${score.correct===score.total?'bg-green-500':'bg-blue-500'}`} style={{width:`${(score.answered/score.total)*100}%`}}/>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{score.answered}/{score.total}</span>
                      </div>
                      {score.answered===score.total&&score.correct===score.total&&(
                        <div className="mt-2 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-3 py-2">
                          <Trophy size={13} className="text-green-500"/><p className="text-xs text-green-700 dark:text-green-300 font-bold">Perfeito! Tudo correcto! 🎉</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-5">
                    {activeSection.quiz.map(q=>{
                      const key=`${activeSection.id}_${q.id}`;
                      const chosen=quizAnswers[key]; const revealed=quizRevealed[key];
                      return (
                        <div key={q.id}>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">{q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt,i)=>{
                              let cls='border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
                              if(revealed){
                                if(i===q.correctIndex) cls='border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold';
                                else if(i===chosen) cls='border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300';
                                else cls='border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-300 dark:text-slate-600 opacity-50';
                              }
                              return (
                                <button key={i} onClick={()=>handleQuizAnswer(activeSection.id,q.id,i)}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${cls} ${!revealed?'hover:border-[#003366] hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer active:scale-[0.98]':'cursor-default'}`}>
                                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${revealed&&i===q.correctIndex?'border-green-500 bg-green-500':revealed&&i===chosen?'border-red-400 bg-red-400':'border-current opacity-40'}`}>
                                    {revealed&&i===q.correctIndex&&<Check size={10} className="text-white"/>}
                                    {revealed&&i===chosen&&i!==q.correctIndex&&<X size={10} className="text-white"/>}
                                  </span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {revealed&&q.explanation&&(
                            <div className="mt-3 flex gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3">
                              <Info size={13} className="text-blue-500 shrink-0 mt-0.5"/>
                              <p className="text-sm text-blue-700 dark:text-blue-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navegação entre secções */}
              <div className="flex gap-3 pt-2 pb-8">
                {(()=>{
                  const idx=visibleSections.findIndex(s=>s.id===activeId);
                  const prev=visibleSections[idx-1]; const next=visibleSections[idx+1];
                  return (<>
                    {prev?<button onClick={()=>setActiveId(prev.id)} className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-medium hover:border-[#003366] transition-colors"><ChevronLeft size={16} className="shrink-0"/><span className="truncate">{prev.pageLabel}</span></button>:<div className="flex-1"/>}
                    {next&&<button onClick={()=>setActiveId(next.id)} className={`flex-1 flex items-center justify-end gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r ${SECTION_COLORS[next.id]||'from-[#003366] to-[#0054A6]'} text-white text-sm font-black shadow hover:opacity-90`}><span className="truncate">{next.pageLabel}</span><ArrowRight size={16} className="shrink-0"/></button>}
                  </>);
                })()}
              </div>
            </div>
          </div>
        ):(
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><BookOpen size={36} className="text-slate-300 mx-auto mb-3"/><p className="text-slate-400">Selecciona uma secção</p></div>
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {isEditing&&editingSection&&(()=>{
        const es=editingSection;
        return (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <h3 className="font-black text-slate-800 dark:text-white">Editar — {es.pageLabel}</h3>
                <button onClick={()=>setIsEditing(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18}/></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome</label><input value={es.pageLabel} onChange={e=>upd('pageLabel',e.target.value)} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white"/></div>
                  <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ícone Lucide</label><input value={es.icon} onChange={e=>upd('icon',e.target.value)} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white"/></div>
                </div>
                <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Descrição</label><textarea value={es.description} onChange={e=>upd('description',e.target.value)} rows={2} className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none"/></div>
                {/* Passos */}
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Passos</label><button onClick={()=>upd('steps',[...es.steps,{id:generateUUID(),text:'',note:'',imageUrl:'',videoUrl:''}])} className="flex items-center gap-1 text-xs text-blue-600 font-medium"><Plus size={11}/>Passo</button></div>
                  <div className="space-y-2">{es.steps.map((step,i)=>(
                    <div key={step.id} className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 space-y-2">
                      <div className="flex gap-2"><span className="text-xs font-black text-slate-400 mt-1 w-4">{i+1}.</span><textarea value={step.text} onChange={e=>upd('steps',es.steps.map((s,si)=>si===i?{...s,text:e.target.value}:s))} rows={2} placeholder="Texto" className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none"/><button onClick={()=>upd('steps',es.steps.filter((_,si)=>si!==i))} className="p-1 text-red-400 shrink-0"><Trash2 size={13}/></button></div>
                      <input value={step.note||''} placeholder="Nota âmbar" onChange={e=>upd('steps',es.steps.map((s,si)=>si===i?{...s,note:e.target.value}:s))} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white"/>
                      <input value={step.imageUrl||''} placeholder="URL imagem" onChange={e=>upd('steps',es.steps.map((s,si)=>si===i?{...s,imageUrl:e.target.value}:s))} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white"/>
                      <input value={step.videoUrl||''} placeholder="URL vídeo (mp4 ou YouTube)" onChange={e=>upd('steps',es.steps.map((s,si)=>si===i?{...s,videoUrl:e.target.value}:s))} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white"/>
                    </div>
                  ))}</div>
                </div>
                {/* Notas */}
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Notas Importantes</label><button onClick={()=>upd('importantNotes',[...es.importantNotes,''])} className="flex items-center gap-1 text-xs text-blue-600 font-medium"><Plus size={11}/>Adicionar</button></div>
                  <div className="space-y-2">{es.importantNotes.map((note,i)=>(<div key={i} className="flex gap-2"><input value={note} onChange={e=>upd('importantNotes',es.importantNotes.map((n,ni)=>ni===i?e.target.value:n))} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"/><button onClick={()=>upd('importantNotes',es.importantNotes.filter((_,ni)=>ni!==i))} className="p-1 text-red-400"><Trash2 size={13}/></button></div>))}</div>
                </div>
                {/* Quiz */}
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Quiz</label><button onClick={()=>upd('quiz',[...es.quiz,{id:generateUUID(),question:'',options:['','','',''],correctIndex:0,explanation:''}])} className="flex items-center gap-1 text-xs text-blue-600 font-medium"><Plus size={11}/>Pergunta</button></div>
                  <div className="space-y-3">{es.quiz.map((q,qi)=>(<div key={q.id} className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 space-y-2">
                    <div className="flex gap-2"><textarea value={q.question} onChange={e=>upd('quiz',es.quiz.map((qq,qqi)=>qqi===qi?{...qq,question:e.target.value}:qq))} rows={2} placeholder="Pergunta" className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none"/><button onClick={()=>upd('quiz',es.quiz.filter((_,qqi)=>qqi!==qi))} className="p-1 text-red-400 shrink-0"><Trash2 size={13}/></button></div>
                    <div className="space-y-1">{q.options.map((opt,oi)=>(<div key={oi} className="flex items-center gap-2"><input type="radio" checked={q.correctIndex===oi} onChange={()=>upd('quiz',es.quiz.map((qq,qqi)=>qqi===qi?{...qq,correctIndex:oi}:qq))}/><input value={opt} onChange={e=>upd('quiz',es.quiz.map((qq,qqi)=>qqi===qi?{...qq,options:qq.options.map((o,ooi)=>ooi===oi?e.target.value:o)}:qq))} placeholder={`Opção ${oi+1}`} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white"/></div>))}</div>
                    <input value={q.explanation||''} placeholder="Explicação após resposta" onChange={e=>upd('quiz',es.quiz.map((qq,qqi)=>qqi===qi?{...qq,explanation:e.target.value}:qq))} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white"/>
                  </div>))}</div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
                <button onClick={()=>setIsEditing(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancelar</button>
                <button onClick={saveSection} className="flex-1 py-3 rounded-2xl bg-[#003366] text-white text-sm font-black flex items-center justify-center gap-2"><Save size={15}/>Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal confirmação de eliminação */}
      {deleteConfirm&&(
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-red-500 px-6 py-5 text-white text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2"><AlertCircle size={26}/></div>
              <h3 className="font-black text-lg">Eliminar secção?</h3>
              <p className="text-sm text-white/70 mt-1">Esta acção é reposta automaticamente pelo sistema</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">"{deleteConfirm.label}"</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-3 flex gap-2">
                <Info size={13} className="text-amber-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700 dark:text-amber-300">Se for uma secção inicial, será reposta automaticamente na próxima visita à página.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-black">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show&&(
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-white flex items-center gap-2 ${toast.type==='success'?'bg-green-600':'bg-red-500'}`}>
          {toast.type==='success'?<CheckCircle size={15}/>:<XCircle size={15}/>}{toast.message}
        </div>
      )}
    </div>
  );
};

export default Manual;
