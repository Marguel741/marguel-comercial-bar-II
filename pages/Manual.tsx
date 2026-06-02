import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, ChevronRight, ChevronDown, ChevronUp, Edit3, Save, X, Plus, Trash2,
  CheckCircle, XCircle, HelpCircle, Image, Video, StickyNote, GripVertical,
  LayoutDashboard, MonitorPlay, ShoppingCart, CalendarRange, Package,
  DollarSign, Wallet, BarChart3, History, Settings, Users, LogIn, UserPlus,
  Clock, Shield, Sparkles, AlertTriangle, Info, ArrowRight, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useLayout } from '../contexts/LayoutContext';
import { db } from '../src/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { generateUUID } from '../src/utils';
import { ManualSection, ManualStep, QuizQuestion } from '../types';

// ─── Secções iniciais (criadas no primeiro acesso) ────────────────────────────
const INITIAL_SECTIONS: Omit<ManualSection, 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'sec_register',
    order: 0,
    pageLabel: 'Criar Conta',
    route: '/register',
    icon: 'UserPlus',
    description: 'Como criar uma conta nova no sistema Marguel SGI.',
    steps: [
      { id: 's1', text: 'Acede ao site e clica em "Criar conta nova" no ecrã de login.', note: 'Precisas de um endereço de email válido.' },
      { id: 's2', text: 'Preenche o teu nome completo, email e escolhe um PIN de 4 dígitos. O PIN substitui a palavra-passe — guarda-o bem.' },
      { id: 's3', text: 'Submete o formulário. A tua conta fica em estado "A aguardar aprovação" até um administrador a activar.' },
    ],
    importantNotes: [
      'Não consegues entrar no sistema enquanto a conta não for aprovada.',
      'O PIN é guardado de forma segura — não o partilhes com ninguém.',
    ],
    quiz: [
      { id: 'q1', question: 'O que acontece depois de criar a conta?', options: ['Entras directamente no sistema', 'A conta fica a aguardar aprovação', 'Recebes um email de confirmação', 'O sistema cria automaticamente um PIN'], correctIndex: 1, explanation: 'Toda a conta nova precisa de aprovação por um administrador antes de poder aceder ao sistema.' },
    ],
  },
  {
    id: 'sec_login',
    order: 1,
    pageLabel: 'Login',
    route: '/login',
    icon: 'LogIn',
    description: 'Como entrar no sistema com a tua conta.',
    steps: [
      { id: 's1', text: 'Introduz o teu email e o PIN de 4 dígitos.' },
      { id: 's2', text: 'Clica em "Entrar". Se os dados estiverem correctos, serás redirecionado para a Página Inicial.' },
      { id: 's3', text: 'Podes activar a biometria (impressão digital / Face ID) nas Definições para entrar mais rapidamente da próxima vez.' },
    ],
    importantNotes: [
      'Se a conta ainda não foi aprovada, serás redirecionado para a página de aprovação pendente.',
      'Se a conta foi banida, verás uma mensagem de acesso negado.',
    ],
    quiz: [
      { id: 'q1', question: 'Qual é a palavra-passe usada no Marguel SGI?', options: ['Uma password de texto', 'Um PIN de 4 dígitos', 'Um código QR', 'O número de telefone'], correctIndex: 1, explanation: 'O sistema usa um PIN de 4 dígitos em vez de uma password tradicional.' },
    ],
  },
  {
    id: 'sec_pending',
    order: 2,
    pageLabel: 'A Aguardar Aprovação',
    route: '/pending-approval',
    icon: 'Clock',
    description: 'O que acontece enquanto a conta está a aguardar aprovação.',
    steps: [
      { id: 's1', text: 'Depois de criar conta, és redirecionado para esta página automaticamente.' },
      { id: 's2', text: 'Um administrador ou proprietário irá aprovar a tua conta na página de Utilizadores.' },
      { id: 's3', text: 'Quando a conta for aprovada, poderás entrar normalmente com o teu email e PIN.' },
    ],
    importantNotes: [
      'Não há prazo definido para aprovação — depende de quando um admin aceder ao sistema.',
      'Não é necessário criar outra conta enquanto esperas.',
    ],
    quiz: [
      { id: 'q1', question: 'O que deves fazer enquanto a conta está pendente?', options: ['Criar outra conta', 'Aguardar que um administrador aprove', 'Contactar o suporte técnico', 'Redefinir o PIN'], correctIndex: 1, explanation: 'Basta aguardar. Um administrador irá aprovar a conta na página de Utilizadores.' },
    ],
  },
  {
    id: 'sec_banned',
    order: 3,
    pageLabel: 'Conta Banida',
    route: '/banned',
    icon: 'Shield',
    description: 'O que significa ter a conta banida e o que podes fazer.',
    steps: [
      { id: 's1', text: 'Se a tua conta foi banida, verás esta página ao tentar entrar.' },
      { id: 's2', text: 'O ban é aplicado por um administrador ou proprietário na página de Utilizadores.' },
      { id: 's3', text: 'Para resolver a situação, contacta directamente o proprietário do estabelecimento.' },
    ],
    importantNotes: [
      'Uma conta banida não pode aceder a nenhuma parte do sistema.',
      'Apenas o PROPRIETARIO ou ADMIN_GERAL pode remover o ban.',
    ],
    quiz: [
      { id: 'q1', question: 'Quem pode remover o ban de uma conta?', options: ['O próprio utilizador', 'Qualquer colaborador', 'PROPRIETARIO ou ADMIN_GERAL', 'O sistema automaticamente após 24h'], correctIndex: 2, explanation: 'Apenas o PROPRIETARIO ou ADMIN_GERAL tem permissão para banir e desbanir contas.' },
    ],
  },
  {
    id: 'sec_dashboard',
    order: 4,
    pageLabel: 'Página Inicial',
    route: '/',
    icon: 'LayoutDashboard',
    description: 'Visão geral do negócio — vendas, stock, alertas e notificações.',
    steps: [
      { id: 's1', text: 'A Página Inicial mostra sempre os dados de ontem. As vendas de hoje só aparecem amanhã, depois do fecho.', note: 'Isto é intencional — as vendas são registadas no dia seguinte.' },
      { id: 's2', text: 'O card "Total Vendido" mostra a receita esperada com base nos preços. "Total Levantado" é o dinheiro físico contado.' },
      { id: 's3', text: 'A "Divergência" é a diferença entre o esperado e o levantado. Verde = dinheiro a mais. Vermelho = dinheiro em falta.' },
      { id: 's4', text: 'Os alertas de stock mostram produtos em nível crítico ou baixo. Clica num alerta para ir directamente ao Inventário.' },
      { id: 's5', text: 'O gráfico de despesas mostra as categorias do mês. Clica no botão de expandir para ver em ecrã inteiro.' },
    ],
    importantNotes: [
      'Os dados mostrados são sempre do dia anterior — nunca do dia actual.',
      'As notificações no canto superior direito são alertas internos do sistema.',
    ],
    quiz: [
      { id: 'q1', question: 'Porque é que a Página Inicial mostra dados de ontem?', options: ['É um bug do sistema', 'As vendas são registadas no dia seguinte ao turno', 'O sistema está atrasado', 'A data do sistema está errada'], correctIndex: 1, explanation: 'O fluxo do bar regista as vendas na manhã seguinte — por isso a dashboard mostra sempre o dia anterior.' },
      { id: 'q2', question: 'O que significa divergência verde?', options: ['Dinheiro em falta', 'Stock a zero', 'Dinheiro a mais do que o esperado', 'Sistema offline'], correctIndex: 2, explanation: 'Verde = dinheiro a mais (sobra de caixa). Vermelho = dinheiro em falta (quebra de caixa).' },
    ],
  },
  {
    id: 'sec_direct',
    order: 5,
    pageLabel: 'Atendimento Directo',
    route: '/direct-service',
    icon: 'MonitorPlay',
    description: 'Registo de vendas avulsas em tempo real, fora do fecho normal.',
    steps: [
      { id: 's1', text: 'Usa esta página para registar vendas pontuais durante o turno — por exemplo, uma mesa que pede fora do horário normal.' },
      { id: 's2', text: 'Pesquisa o produto pelo nome ou filtra por categoria. Clica no "+" para adicionar ao carrinho.' },
      { id: 's3', text: 'Se um produto faz parte de um Mix&Match, o desconto é aplicado automaticamente ao atingir a quantidade mínima.', note: 'O Mix&Match é configurado em Preços & Compras.' },
      { id: 's4', text: 'No checkout, escolhe o método de pagamento: Dinheiro, TPA ou Transferência. Confirma a venda.' },
      { id: 's5', text: 'A venda fica guardada no histórico e sincroniza com o servidor automaticamente quando há ligação.' },
    ],
    importantNotes: [
      'O Atendimento Directo NÃO afecta o stock — é apenas um registo financeiro.',
      'As vendas ficam primeiro no dispositivo (offline) e sincronizam depois.',
      'Não substitui o fecho diário normal do Controle de Vendas.',
    ],
    quiz: [
      { id: 'q1', question: 'O Atendimento Directo afecta o stock?', options: ['Sim, deduz automaticamente', 'Não, é apenas um registo financeiro', 'Só afecta se confirmarmos no fecho', 'Depende do produto'], correctIndex: 1, explanation: 'O Atendimento Directo regista a venda mas não toca no stock. O stock só é actualizado no Fecho Confirmado.' },
      { id: 'q2', question: 'O que acontece a uma venda feita sem ligação à internet?', options: ['Perde-se', 'Fica guardada no dispositivo e sincroniza depois', 'É cancelada automaticamente', 'Aparece a vermelho e não conta'], correctIndex: 1, explanation: 'O sistema guarda a venda localmente (IndexedDB) e sincroniza com o servidor quando a ligação é restaurada.' },
    ],
  },
  {
    id: 'sec_sales',
    order: 6,
    pageLabel: 'Controle de Vendas',
    route: '/sales',
    icon: 'ShoppingCart',
    description: 'Registo do fecho diário — quantidades vendidas, valores levantados e confirmação do stock.',
    steps: [
      { id: 's1', text: 'Selecciona a data do turno (normalmente ontem). A tabela mostra todos os produtos com o stock inicial calculado.' },
      { id: 's2', text: 'Preenche as quantidades vendidas de cada produto. O sistema calcula automaticamente o stock final e a receita esperada.' },
      { id: 's3', text: 'No resumo financeiro, indica quanto foi levantado em Dinheiro, TPA e Transferência.' },
      { id: 's4', text: 'Clica em "Submeter Fecho Parcial". Isto cria o relatório com estado FECHO_PARCIAL — o stock ainda não foi deduzido.', note: 'Quem faz o Fecho Parcial: o gerente ou funcionário com permissão.' },
      { id: 's5', text: 'Um segundo utilizador (ADMIN ou PROPRIETARIO) revê os dados e clica em "Confirmar Fecho". Neste momento o stock é deduzido e o valor é adicionado à Conta Bancária.', note: 'O Fecho Confirmado é irreversível sem intervenção de admin.' },
    ],
    importantNotes: [
      'O stock SÓ é deduzido no Fecho Confirmado — nunca no Fecho Parcial.',
      'O valor levantado em TPA e Transferência vai para a Conta Bancária. O dinheiro em Caixa vai para o cartão Em Mão.',
      'Após confirmação, o relatório fica bloqueado para edição.',
    ],
    quiz: [
      { id: 'q1', question: 'Quando é que o stock é deduzido?', options: ['Ao submeter o Fecho Parcial', 'Ao confirmar o Fecho Confirmado', 'No dia seguinte automaticamente', 'Quando o admin faz login'], correctIndex: 1, explanation: 'O stock só é processado no Fecho Confirmado. O Fecho Parcial apenas regista os dados.' },
      { id: 'q2', question: 'Onde vai o dinheiro levantado em TPA?', options: ['Em Mão', 'Marguel Reserve', 'Conta Bancária', 'Fica em espera'], correctIndex: 2, explanation: 'TPA e Transferência vão para a Conta Bancária. Dinheiro em espécie vai para o cartão Em Mão.' },
      { id: 'q3', question: 'Quem pode fazer o Fecho Confirmado?', options: ['Qualquer utilizador', 'Só o FUNCIONARIO', 'ADMIN_GERAL ou PROPRIETARIO', 'O sistema automaticamente'], correctIndex: 2, explanation: 'O segundo fecho (confirmação) requer permissão de ADMIN_GERAL ou PROPRIETARIO.' },
    ],
  },
  {
    id: 'sec_calendar',
    order: 7,
    pageLabel: 'Calendário Marguel',
    route: '/calendar',
    icon: 'CalendarRange',
    description: 'Vista mensal dos fechos — histórico, divergências, bloqueios e relatórios PDF.',
    steps: [
      { id: 's1', text: 'O calendário mostra todos os dias do mês. Cada dia tem uma cor conforme o estado: verde (fecho confirmado), amarelo (fecho parcial), cinzento (sem registo).' },
      { id: 's2', text: 'Clica num dia para ver os detalhes: total vendido, levantado, divergência e estado do fecho.' },
      { id: 's3', text: 'No painel do dia podes gerar um relatório PDF com todos os dados desse fecho.' },
      { id: 's4', text: 'O ADMIN pode bloquear um dia para impedir edições retroactivas. Um dia bloqueado não pode ser alterado.' },
      { id: 's5', text: 'Para desbloquear um dia bloqueado é necessário permissão especial e um motivo justificado.' },
    ],
    importantNotes: [
      '"Dinheiro a mais" significa que foi levantado mais do que o esperado pelas vendas.',
      '"Dinheiro em falta" significa que faltou dinheiro em relação ao esperado.',
      'Bloquear um dia é uma acção de segurança — impede alterações acidentais ou fraudulentas.',
    ],
    quiz: [
      { id: 'q1', question: 'O que significa um dia a amarelo no calendário?', options: ['Fecho confirmado', 'Fecho parcial — ainda não confirmado', 'Dia bloqueado', 'Sem registo de vendas'], correctIndex: 1, explanation: 'Amarelo = Fecho Parcial submetido mas ainda aguarda confirmação do segundo utilizador.' },
    ],
  },
  {
    id: 'sec_inventory',
    order: 8,
    pageLabel: 'Inventário',
    route: '/inventory',
    icon: 'Package',
    description: 'Gestão completa de produtos, stock, categorias e equipamentos.',
    steps: [
      { id: 's1', text: 'A lista de produtos mostra o stock actual de cada item com indicador de cor: verde (OK), amarelo (baixo), vermelho (crítico).' },
      { id: 's2', text: 'Usa os filtros no topo para ver apenas produtos Críticos, Baixos ou OK.' },
      { id: 's3', text: 'Clica num produto para editar: nome, preço, stock mínimo, packSize. Podes também fazer um ajuste manual de stock com justificação.' },
      { id: 's4', text: 'A secção Equipamentos mostra mesas, cadeiras, grades e outros itens físicos do bar. Actualiza as quantidades após contagem física.' },
      { id: 's5', text: 'O histórico de ajustes mostra todas as alterações de stock feitas manualmente, com data e responsável.' },
    ],
    importantNotes: [
      'O stock do Inventário reflecte sempre o estado após o último Fecho Confirmado mais ajustes manuais.',
      'Ajustes manuais ficam registados na auditoria com o responsável e motivo.',
    ],
    quiz: [
      { id: 'q1', question: 'Um produto a vermelho no Inventário significa:', options: ['Produto eliminado', 'Stock em nível crítico (abaixo do mínimo)', 'Preço desactualizado', 'Produto sem categoria'], correctIndex: 1, explanation: 'Vermelho = stock abaixo do mínimo definido. O sistema gera um alerta na Página Inicial.' },
    ],
  },
  {
    id: 'sec_prices',
    order: 9,
    pageLabel: 'Preços & Compras',
    route: '/prices',
    icon: 'DollarSign',
    description: 'Gestão de preços, Mix&Match, simulador de compras e central de compras.',
    steps: [
      { id: 's1', text: 'A tabela de preços mostra preço de venda e preço de custo de cada produto. Clica para editar.' },
      { id: 's2', text: 'O Mix&Match permite criar promoções: ex. "compra 2 Cucas e 1 Sumol por 900 Kz". Activa-se automaticamente no Atendimento Directo.' },
      { id: 's3', text: 'O Simulador de Propostas calcula o custo total de uma compra antes de a confirmar.' },
      { id: 's4', text: 'Na Central de Compras, regista as compras reais de stock. Podes dividir entre Bar (stock imediato) e Reserva (stock guardado).' },
      { id: 's5', text: 'Escolhe se o pagamento sai da Conta Bancária ou Em Mão. O valor é debitado automaticamente do cartão escolhido.' },
    ],
    importantNotes: [
      'Alterar um preço fica registado no histórico de preços com data e responsável.',
      'O packSize (unidades por embalagem) é crítico — afecta todos os cálculos de stock.',
    ],
    quiz: [
      { id: 'q1', question: 'O que é o Mix&Match?', options: ['Um relatório de vendas misto', 'Uma promoção de combinação de produtos com preço especial', 'Uma forma de transferir stock', 'Um tipo de fecho de caixa'], correctIndex: 1, explanation: 'Mix&Match é uma promoção que combina produtos. Aplica-se automaticamente no Atendimento Directo.' },
    ],
  },
  {
    id: 'sec_expenses',
    order: 10,
    pageLabel: 'Despesas',
    route: '/expenses',
    icon: 'Wallet',
    description: 'Registo e histórico de todas as despesas do estabelecimento.',
    steps: [
      { id: 's1', text: 'Clica em "Nova Despesa" e preenche: título, valor, categoria, data e nota opcional.' },
      { id: 's2', text: 'Escolhe de onde sai o dinheiro: Conta Bancária ou Em Mão. O saldo do cartão escolhido é debitado automaticamente.' },
      { id: 's3', text: 'Podes anexar fotos de facturas ou comprovativos.' },
      { id: 's4', text: 'O histórico mostra todas as despesas e também as compras de stock (só leitura), para teres uma visão completa das saídas.' },
    ],
    importantNotes: [
      'A despesa de almoço diário é criada automaticamente no Fecho Confirmado — não precisas de a registar manualmente.',
      'Eliminar uma despesa cria um estorno — o valor volta ao cartão. Não é apagado do histórico.',
    ],
    quiz: [
      { id: 'q1', question: 'O que acontece quando eliminas uma despesa?', options: ['É apagada permanentemente', 'Fica marcada como inactiva', 'É criado um estorno e o valor volta ao cartão', 'Nada — não se pode eliminar'], correctIndex: 2, explanation: 'Por segurança, eliminar uma despesa cria um registo de estorno. O histórico mantém-se completo.' },
    ],
  },
  {
    id: 'sec_account',
    order: 11,
    pageLabel: 'Estado da Conta',
    route: '/account',
    icon: 'BarChart3',
    description: 'Gestão dos cartões financeiros, saldos, transferências e histórico de transacções.',
    steps: [
      { id: 's1', text: 'Há três cartões principais: Conta Bancária (recebe TPA e transferências), Em Mão (dinheiro físico) e Marguel Reserve (poupança).' },
      { id: 's2', text: 'Cada cartão mostra o saldo actual. Clica num cartão para ver o histórico de movimentos detalhado.' },
      { id: 's3', text: 'Usa "Transferência entre cartões" para mover saldo de um cartão para outro — ex: passar dinheiro Em Mão para a Conta Bancária.' },
      { id: 's4', text: 'O histórico de transacções mostra entradas e saídas com data, descrição e referência à operação que gerou o movimento.' },
    ],
    importantNotes: [
      'Os saldos actualizam-se automaticamente com cada fecho, despesa ou compra.',
      'Não é possível eliminar transacções — apenas criar estornos.',
    ],
    quiz: [
      { id: 'q1', question: 'Onde vai o dinheiro em espécie levantado no fecho?', options: ['Conta Bancária', 'Marguel Reserve', 'Em Mão', 'Fica em espera até transferência manual'], correctIndex: 2, explanation: 'O dinheiro físico (cash) vai para o cartão Em Mão. TPA e transferências vão para a Conta Bancária.' },
    ],
  },
  {
    id: 'sec_audit',
    order: 12,
    pageLabel: 'Auditoria Global',
    route: '/audit',
    icon: 'History',
    description: 'Registo completo de todas as acções críticas realizadas no sistema.',
    steps: [
      { id: 's1', text: 'A Auditoria mostra os últimos 200 registos de acções: fechos, ajustes de stock, alterações de preços, logins, etc.' },
      { id: 's2', text: 'Cada registo tem: data/hora, utilizador responsável, módulo, descrição da acção e valores antes/depois.' },
      { id: 's3', text: 'Usa os filtros por módulo (VENDAS, STOCK, FINANCEIRO...) para encontrar acções específicas.' },
    ],
    importantNotes: [
      'A Auditoria é imutável por defeito — os registos não podem ser apagados.',
      'Qualquer acção sensível no sistema fica aqui registada automaticamente.',
    ],
    quiz: [
      { id: 'q1', question: 'Quantos registos mostra a Auditoria de cada vez?', options: ['50', '100', '200', 'Todos ilimitados'], correctIndex: 2, explanation: 'A Auditoria carrega os últimos 200 registos para não sobrecarregar o sistema.' },
    ],
  },
  {
    id: 'sec_users',
    order: 13,
    pageLabel: 'Utilizadores',
    route: '/users',
    icon: 'Users',
    description: 'Gestão de contas: aprovação, permissões, cargos e bans.',
    steps: [
      { id: 's1', text: 'A lista mostra todos os utilizadores registados com o seu estado (aprovado, pendente, banido).' },
      { id: 's2', text: 'Clica num utilizador para: aprovar a conta, editar permissões individuais, alterar o cargo ou banir.' },
      { id: 's3', text: 'Cada permissão pode ser activada ou desactivada individualmente — ex: dar acesso à Auditoria sem dar acesso às Despesas.' },
    ],
    importantNotes: [
      'Dois utilizadores nunca podem ser eliminados: dono@marguel.com e admin@marguel.com.',
      'Alterar permissões envia uma notificação automática ao utilizador afectado com link para o Manual.',
    ],
    quiz: [
      { id: 'q1', question: 'O que acontece quando aprovamos um utilizador?', options: ['Ele recebe um email automático', 'Pode entrar imediatamente no sistema com o seu PIN', 'O sistema cria um PIN aleatório para ele', 'Tem de criar a conta de novo'], correctIndex: 1, explanation: 'Ao ser aprovado, o utilizador pode entrar directamente com o email e PIN que registou.' },
    ],
  },
  {
    id: 'sec_settings',
    order: 14,
    pageLabel: 'Definições',
    route: '/settings',
    icon: 'Settings',
    description: 'Configurações pessoais, biometria, tema e diagnóstico do sistema.',
    steps: [
      { id: 's1', text: 'Activa a biometria para entrar no sistema com impressão digital ou Face ID sem precisar de inserir o PIN.' },
      { id: 's2', text: 'Altera o tema entre claro e escuro conforme a tua preferência.' },
      { id: 's3', text: 'A secção de Diagnóstico mostra o estado da ligação ao Firestore e a versão actual do sistema.' },
    ],
    importantNotes: [
      'A biometria fica guardada no dispositivo — não no servidor.',
      'A data do sistema pode ser alterada aqui por admins para corrigir registos históricos.',
    ],
    quiz: [
      { id: 'q1', question: 'A biometria activada nas Definições funciona em qualquer dispositivo?', options: ['Sim, em qualquer dispositivo', 'Não, fica guardada apenas no dispositivo onde foi activada', 'Só em Android', 'Só se estiver online'], correctIndex: 1, explanation: 'A biometria usa dados locais do dispositivo. Tens de activar separadamente em cada dispositivo que uses.' },
    ],
  },
  {
    id: 'sec_manual',
    order: 15,
    pageLabel: 'Manual de Uso',
    route: '/manual',
    icon: 'BookOpen',
    description: 'Como usar este próprio Manual de Uso.',
    steps: [
      { id: 's1', text: 'O menu lateral esquerdo mostra todas as secções disponíveis. Clica numa para navegar directamente.' },
      { id: 's2', text: 'Cada secção tem: descrição, passos detalhados, notas importantes e um quiz no final.' },
      { id: 's3', text: 'Responde ao quiz — verás imediatamente se acertaste (verde) ou erraste (vermelho) com explicação.' },
      { id: 's4', text: 'Se fores PROPRIETARIO ou ADMIN_GERAL, aparece o botão "Editar" no topo. Podes criar secções, editar texto, adicionar imagens/vídeos e modificar perguntas do quiz.' },
    ],
    importantNotes: [
      'As edições guardam-se no Firestore — ficam visíveis para todos imediatamente.',
      'Podes reordenar as secções arrastando pelo ícone de grip.',
    ],
    quiz: [
      { id: 'q1', question: 'Quem pode editar o conteúdo do Manual de Uso?', options: ['Qualquer utilizador', 'Apenas o PROPRIETARIO', 'PROPRIETARIO e ADMIN_GERAL', 'Ninguém — é só leitura'], correctIndex: 2, explanation: 'Apenas o PROPRIETARIO e ADMIN_GERAL têm o botão de edição disponível.' },
    ],
  },
  {
    id: 'sec_novidades',
    order: 16,
    pageLabel: 'O que há de novo',
    route: '/novidades',
    icon: 'Sparkles',
    description: 'Como funcionam as novidades e o sistema de changelog.',
    steps: [
      { id: 's1', text: 'Sempre que há uma nova versão do sistema, aparece um pop-up automático ao entrar com as novidades.' },
      { id: 's2', text: 'O ícone "O que há de novo" no menu mostra um badge vermelho enquanto há versões que ainda não viste.' },
      { id: 's3', text: 'Cada entrada de novidade tem: versão, data, título e lista de alterações categorizadas (Bug, Melhoria, Nova funcionalidade).' },
      { id: 's4', text: 'Se fores PROPRIETARIO ou ADMIN_GERAL, podes publicar novas entradas clicando em "Nova entrada".' },
    ],
    importantNotes: [
      'O registo de "já vi" fica guardado no Firestore — funciona em qualquer dispositivo.',
      'O pop-up só aparece uma vez por versão.',
    ],
    quiz: [
      { id: 'q1', question: 'O pop-up de novidades volta a aparecer se fecharmos e reabrirmos o site?', options: ['Sim, sempre', 'Não, só aparece uma vez por versão nova', 'Só se limparmos o cache', 'Depende do cargo'], correctIndex: 1, explanation: 'O sistema guarda no Firestore quais versões o utilizador já viu. O pop-up só aparece para versões novas.' },
    ],
  },
];

// ─── Mapa de ícones ───────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.FC<any>> = {
  UserPlus, LogIn, Clock, Shield, LayoutDashboard, MonitorPlay, ShoppingCart,
  CalendarRange, Package, DollarSign, Wallet, BarChart3, History, Settings,
  Users, BookOpen, Sparkles,
};

const CATEGORY_COLORS: Record<string, string> = {
  Bug: 'bg-red-100 text-red-700 border-red-200',
  Melhoria: 'bg-blue-100 text-blue-700 border-blue-200',
  'Nova funcionalidade': 'bg-green-100 text-green-700 border-green-200',
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Manual: React.FC = () => {
  const { user } = useAuth();
  const { sidebarMode } = useLayout();
  const { addAuditLog } = useProducts();

  const canEdit = user?.role === 'PROPRIETARIO' || user?.role === 'ADMIN_GERAL';

  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<ManualSection | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Carregar secções do Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'appdata/manual/sections'), snap => {
      if (snap.empty) {
        // Primeiro acesso — criar secções iniciais
        const now = Date.now();
        INITIAL_SECTIONS.forEach(s => {
          const full: ManualSection = { ...s, updatedAt: now, updatedBy: 'Sistema' };
          setDoc(doc(db, 'appdata/manual/sections', full.id), full);
        });
      } else {
        const loaded = snap.docs
          .map(d => d.data() as ManualSection)
          .sort((a, b) => a.order - b.order);
        setSections(loaded);
        if (!activeId && loaded.length > 0) setActiveId(loaded[0].id);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    addAuditLog({ action: 'ACESSO_PAGINA' as any, module: 'SISTEMA', description: `${user?.name} acedeu ao Manual de Uso.` });
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const handleQuizAnswer = (sectionId: string, questionId: string, optionIndex: number) => {
    const key = `${sectionId}_${questionId}`;
    if (quizRevealed[key]) return;
    setQuizAnswers(prev => ({ ...prev, [key]: optionIndex }));
    setQuizRevealed(prev => ({ ...prev, [key]: true }));
  };

  // ── Edição ────────────────────────────────────────────────────────────────
  const startEdit = (section: ManualSection) => {
    setEditingSection(JSON.parse(JSON.stringify(section)));
    setIsEditing(true);
  };

  const saveSection = async () => {
    if (!editingSection) return;
    const updated: ManualSection = { ...editingSection, updatedAt: Date.now(), updatedBy: user?.name || 'Admin' };
    await setDoc(doc(db, 'appdata/manual/sections', updated.id), updated);
    addAuditLog({ action: 'EDITAR_MANUAL' as any, module: 'SISTEMA', entityId: updated.id, description: `Secção "${updated.pageLabel}" do Manual actualizada.` });
    showToast('Secção guardada com sucesso.');
    setIsEditing(false);
    setEditingSection(null);
  };

  const deleteSection = async (id: string) => {
    await deleteDoc(doc(db, 'appdata/manual/sections', id));
    addAuditLog({ action: 'REMOVER_SECCAO_MANUAL' as any, module: 'SISTEMA', entityId: id, description: `Secção do Manual eliminada.` });
    showToast('Secção eliminada.');
  };

  const addNewSection = async () => {
    const id = `sec_${generateUUID().slice(0, 8)}`;
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.order), 0);
    const newSec: ManualSection = {
      id, order: maxOrder + 1, pageLabel: 'Nova Secção', route: '/', icon: 'BookOpen',
      description: 'Descrição desta secção.',
      steps: [{ id: generateUUID(), text: 'Passo 1 — descreve aqui o que o utilizador deve fazer.', note: '' }],
      importantNotes: [], quiz: [], updatedAt: Date.now(), updatedBy: user?.name || 'Admin',
    };
    await setDoc(doc(db, 'appdata/manual/sections', id), newSec);
    startEdit(newSec);
  };

  // ── Render secção ─────────────────────────────────────────────────────────
  const renderSection = (section: ManualSection) => {
    const IconComp = ICON_MAP[section.icon] || BookOpen;
    return (
      <div
        key={section.id}
        ref={el => { sectionRefs.current[section.id] = el; }}
        className="mb-10 scroll-mt-4"
      >
        {/* Header da secção */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003366] flex items-center justify-center shrink-0">
              <IconComp size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{section.pageLabel}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => startEdit(section)} className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors" title="Editar">
                <Edit3 size={16} />
              </button>
              <button onClick={() => deleteSection(section.id)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Passos */}
        {section.steps.length > 0 && (
          <div className="mb-4 space-y-3">
            {section.steps.map((step, idx) => (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#003366] text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                  {idx < section.steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                </div>
                <div className="pb-3 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step.text}</p>
                  {step.imageUrl && <img src={step.imageUrl} alt={`Passo ${idx + 1}`} className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 max-w-full" />}
                  {step.videoUrl && (
                    <div className="mt-2">
                      {step.videoUrl.includes('youtube') || step.videoUrl.includes('youtu.be')
                        ? <iframe className="w-full rounded-xl aspect-video" src={step.videoUrl.replace('watch?v=', 'embed/')} allowFullScreen title={`Vídeo passo ${idx + 1}`} />
                        : <video src={step.videoUrl} controls className="w-full rounded-xl" />}
                    </div>
                  )}
                  {step.note && (
                    <div className="mt-2 flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                      <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">{step.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notas importantes */}
        {section.importantNotes.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-bold text-red-700 dark:text-red-400">Importante</span>
            </div>
            <ul className="space-y-1">
              {section.importantNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-xs text-red-700 dark:text-red-300">
                  <ArrowRight size={12} className="shrink-0 mt-0.5" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quiz */}
        {section.quiz.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle size={16} className="text-[#E3007E]" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Teste o seu conhecimento</span>
            </div>
            <div className="space-y-4">
              {section.quiz.map(q => {
                const key = `${section.id}_${q.id}`;
                const chosen = quizAnswers[key];
                const revealed = quizRevealed[key];
                return (
                  <div key={q.id}>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        let cls = 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200';
                        if (revealed) {
                          if (i === q.correctIndex) cls = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold';
                          else if (i === chosen) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300';
                          else cls = 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-400 opacity-60';
                        }
                        return (
                          <button key={i} onClick={() => handleQuizAnswer(section.id, q.id, i)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${cls} ${!revealed ? 'hover:border-[#003366] hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer' : 'cursor-default'}`}>
                            {revealed && i === q.correctIndex && <Check size={14} className="text-green-500 shrink-0" />}
                            {revealed && i === chosen && i !== q.correctIndex && <X size={14} className="text-red-500 shrink-0" />}
                            {(!revealed || (i !== q.correctIndex && i !== chosen)) && <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-current opacity-40" />}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {revealed && q.explanation && (
                      <div className="mt-2 flex gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linha divisória */}
        <div className="mt-8 border-b border-slate-200 dark:border-slate-700" />
      </div>
    );
  };

  // ── Modal de edição ───────────────────────────────────────────────────────
  const renderEditModal = () => {
    if (!isEditing || !editingSection) return null;
    const es = editingSection;
    const update = (field: keyof ManualSection, value: any) =>
      setEditingSection(prev => prev ? { ...prev, [field]: value } : prev);

    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="w-full md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header modal */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h3 className="font-bold text-slate-800 dark:text-white">Editar Secção</h3>
            <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {/* Campos básicos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Nome da Secção</label>
                <input value={es.pageLabel} onChange={e => update('pageLabel', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ícone (nome Lucide)</label>
                <input value={es.icon} onChange={e => update('icon', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Descrição</label>
              <textarea value={es.description} onChange={e => update('description', e.target.value)} rows={2}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none" />
            </div>

            {/* Passos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Passos</label>
                <button onClick={() => update('steps', [...es.steps, { id: generateUUID(), text: '', note: '', imageUrl: '', videoUrl: '' }])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                  <Plus size={12} /> Adicionar passo
                </button>
              </div>
              <div className="space-y-2">
                {es.steps.map((step, i) => (
                  <div key={step.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400 w-5 mt-1">{i + 1}.</span>
                      <textarea value={step.text}
                        onChange={e => update('steps', es.steps.map((s, si) => si === i ? { ...s, text: e.target.value } : s))}
                        rows={2} placeholder="Texto do passo"
                        className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none" />
                      <button onClick={() => update('steps', es.steps.filter((_, si) => si !== i))}
                        className="p-1 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <input value={step.note || ''} placeholder="Nota (opcional)"
                      onChange={e => update('steps', es.steps.map((s, si) => si === i ? { ...s, note: e.target.value } : s))}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-1" />
                    <input value={step.imageUrl || ''} placeholder="URL da imagem (opcional)"
                      onChange={e => update('steps', es.steps.map((s, si) => si === i ? { ...s, imageUrl: e.target.value } : s))}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-1" />
                    <input value={step.videoUrl || ''} placeholder="URL do vídeo mp4 ou YouTube (opcional)"
                      onChange={e => update('steps', es.steps.map((s, si) => si === i ? { ...s, videoUrl: e.target.value } : s))}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                  </div>
                ))}
              </div>
            </div>

            {/* Notas importantes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas Importantes</label>
                <button onClick={() => update('importantNotes', [...es.importantNotes, ''])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus size={12} /> Adicionar</button>
              </div>
              <div className="space-y-2">
                {es.importantNotes.map((note, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={note} onChange={e => update('importantNotes', es.importantNotes.map((n, ni) => ni === i ? e.target.value : n))}
                      className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                    <button onClick={() => update('importantNotes', es.importantNotes.filter((_, ni) => ni !== i))}
                      className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quiz</label>
                <button onClick={() => update('quiz', [...es.quiz, { id: generateUUID(), question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus size={12} /> Adicionar pergunta</button>
              </div>
              <div className="space-y-3">
                {es.quiz.map((q, qi) => (
                  <div key={q.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                    <div className="flex gap-2 mb-2">
                      <textarea value={q.question} onChange={e => update('quiz', es.quiz.map((qq, qqi) => qqi === qi ? { ...qq, question: e.target.value } : qq))}
                        rows={2} placeholder="Pergunta"
                        className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none" />
                      <button onClick={() => update('quiz', es.quiz.filter((_, qqi) => qqi !== qi))}
                        className="p-1 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <div className="space-y-1 mb-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" checked={q.correctIndex === oi} onChange={() => update('quiz', es.quiz.map((qq, qqi) => qqi === qi ? { ...qq, correctIndex: oi } : qq))} />
                          <input value={opt} onChange={e => update('quiz', es.quiz.map((qq, qqi) => qqi === qi ? { ...qq, options: qq.options.map((o, ooi) => ooi === oi ? e.target.value : o) } : qq))}
                            placeholder={`Opção ${oi + 1}`}
                            className="flex-1 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                        </div>
                      ))}
                    </div>
                    <input value={q.explanation || ''} placeholder="Explicação (após resposta)"
                      onChange={e => update('quiz', es.quiz.map((qq, qqi) => qqi === qi ? { ...qq, explanation: e.target.value } : qq))}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer modal */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
            <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium">Cancelar</button>
            <button onClick={saveSection} className="flex-1 py-2.5 rounded-xl bg-[#003366] text-white text-sm font-bold flex items-center justify-center gap-2">
              <Save size={16} /> Guardar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#E3007E]/30 border-t-[#E3007E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex h-[calc(100vh-0px)] overflow-hidden ${sidebarMode !== 'hidden' ? '' : ''}`}>

      {/* ── Menu lateral interno ── */}
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#003366]" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">Manual de Uso</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {sections.map(s => {
            const IconComp = ICON_MAP[s.icon] || BookOpen;
            return (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all mb-0.5 ${activeId === s.id ? 'bg-[#003366] text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <IconComp size={14} className="shrink-0" />
                <span className="truncate">{s.pageLabel}</span>
              </button>
            );
          })}
        </div>
        {canEdit && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <button onClick={addNewSection} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors">
              <Plus size={14} /> Nova Secção
            </button>
          </div>
        )}
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[#003366]" />
            <div>
              <h1 className="font-bold text-slate-800 dark:text-white text-base">Manual de Uso</h1>
              <p className="text-xs text-slate-400">{sections.length} secções</p>
            </div>
          </div>
          {canEdit && (
            <button onClick={addNewSection} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#003366] text-white text-xs font-bold">
              <Plus size={14} /> Nova Secção
            </button>
          )}
        </div>

        {/* Selector mobile de secções */}
        <div className="md:hidden px-4 pt-3 pb-1 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {sections.map(s => {
              const IconComp = ICON_MAP[s.icon] || BookOpen;
              return (
                <button key={s.id} onClick={() => scrollTo(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeId === s.id ? 'bg-[#003366] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  <IconComp size={12} />
                  {s.pageLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secções */}
        <div className="px-4 py-6 max-w-3xl mx-auto">
          {sections.map(renderSection)}
        </div>
      </div>

      {/* Modal de edição */}
      {renderEditModal()}

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl shadow-xl text-sm font-medium text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Manual;

