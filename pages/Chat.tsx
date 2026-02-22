
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  Search, 
  MoreVertical, 
  FileText, 
  Play,
  Pause,
  Mic, 
  X, 
  Check, 
  CheckCheck,
  Camera,
  Trash2,
  Clock,
  ChevronLeft
} from 'lucide-react';
import SoftCard from '../components/SoftCard';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../App';
import { ChatMessage, User, MessageType } from '../types';

// MOCK USERS DATA (Simulando uma API/Contexto)
const MOCK_USERS: User[] = [
  { id: 'general', name: 'Canal Geral', email: '', role: 'ADMIN_GERAL' as any, isApproved: true, avatar: '', isOnline: true, lastSeen: 'Agora' },
  { id: '1', name: 'Administrador', email: 'admin@marguel.com', role: 'ADMIN_GERAL' as any, isApproved: true, avatar: '', isOnline: true, lastSeen: 'Agora' },
  { id: '2', name: 'José Gerente', email: 'jose@marguel.com', role: 'GERENTE' as any, isApproved: true, avatar: '', isOnline: false, lastSeen: 'Hoje às 10:30' },
  { id: '3', name: 'Maria Vendas', email: 'maria@marguel.com', role: 'FUNCIONARIO' as any, isApproved: true, avatar: '', isOnline: true, lastSeen: 'Agora' },
  { id: '4', name: 'João Logística', email: 'joao@marguel.com', role: 'FUNCIONARIO' as any, isApproved: true, avatar: '', isOnline: false, lastSeen: 'Ontem' },
];

const Chat: React.FC = () => {
  const { sidebarMode, triggerHaptic } = useLayout();
  const { user: currentUser } = useAuth();

  // --- STATE ---
  const [activeChatId, setActiveChatId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDetailsMessageId, setViewDetailsMessageId] = useState<string | null>(null);
  
  // Mobile View Toggle
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  // MOCK MESSAGES (Armazenado por ChatID para simplicidade)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm1', senderId: '1', receiverId: 'general', content: 'Bom dia equipa! Stock atualizado?', type: 'text', timestamp: new Date(Date.now() - 3600000), status: 'read' },
    { id: 'm2', senderId: '2', receiverId: 'general', content: 'Sim chefe, tudo conferido.', type: 'text', timestamp: new Date(Date.now() - 3500000), status: 'read' },
    { id: 'm3', senderId: '1', receiverId: '2', content: 'José, preciso falar sobre o fornecedor.', type: 'text', timestamp: new Date(Date.now() - 86400000), status: 'read' },
  ]);

  // REFS
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<any>(null);

  // --- EFFECTS ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatId]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingIntervalRef.current);
  }, [isRecording]);

  // --- ACTIONS ---

  const activeUser = MOCK_USERS.find(u => u.id === activeChatId);
  
  const handleSendMessage = (type: MessageType = 'text', content: string = inputText, extra?: any) => {
    if ((type === 'text' && !content.trim()) || !activeChatId) return;

    triggerHaptic('success');

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser?.id || 'unknown',
      receiverId: activeChatId,
      content: content,
      type: type,
      timestamp: new Date(),
      status: 'sent',
      ...extra
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowAttachMenu(false);

    // Simulation: Deliver and Read after delay
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
    }, 1500);
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'read' } : m));
    }, 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    handleSendMessage(type, fileUrl, { fileName: file.name });
    e.target.value = ''; // Reset input
  };

  const toggleRecording = () => {
    triggerHaptic('impact');
    if (isRecording) {
      // Stop and Send Mock Audio
      setIsRecording(false);
      handleSendMessage('audio', 'mock_audio_url', { duration: formatTime(recordingTime) });
    } else {
      setIsRecording(true);
    }
  };

  const cancelRecording = () => {
    triggerHaptic('warning');
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleChatSelect = (userId: string) => {
    setActiveChatId(userId);
    setShowSidebarMobile(false);
    triggerHaptic('selection');
  };

  // --- RENDERERS ---

  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg.senderId !== currentUser?.id) return null;
    
    if (msg.status === 'sent') return <Check size={14} className="text-slate-400" />;
    if (msg.status === 'delivered') return <CheckCheck size={14} className="text-slate-400" />;
    if (msg.status === 'read') return <CheckCheck size={14} className="text-blue-500" />;
    return <Clock size={12} className="text-slate-400" />;
  };

  const renderMessageContent = (msg: ChatMessage) => {
    switch (msg.type) {
      case 'text':
        return <p className="whitespace-pre-wrap">{msg.content}</p>;
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden max-w-[260px] mb-1">
            <img src={msg.content} alt="enviado" className="w-full h-auto object-cover" />
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
             <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-white">
               <Play size={16} className="fill-current ml-1" />
             </div>
             <div className="flex-1">
               <div className="h-1 bg-slate-300 dark:bg-slate-500 rounded-full w-full mb-1"></div>
               <span className="text-[10px] opacity-70">{msg.duration || '0:15'}</span>
             </div>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-3 bg-black/5 dark:bg-white/10 p-3 rounded-xl min-w-[200px]">
             <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                <FileText size={24} />
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{msg.fileName || 'Documento'}</p>
                <p className="text-[10px] opacity-60 uppercase">PDF</p>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const filteredUsers = MOCK_USERS.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMessages = messages.filter(m => 
    (m.receiverId === activeChatId && m.senderId === currentUser?.id) || // Eu enviei para o chat ativo
    (m.receiverId === currentUser?.id && m.senderId === activeChatId) || // Chat ativo enviou para mim
    (activeChatId === 'general' && m.receiverId === 'general') // Mensagens do geral
  );

  // Helper for Modal Data
  const selectedMessage = viewDetailsMessageId ? messages.find(m => m.id === viewDetailsMessageId) : null;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4 md:p-8 animate-fade-in overflow-hidden">
      <header className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
        <div className={`transition-all duration-300 ${sidebarMode === 'hidden' ? 'pl-16 md:pl-20' : ''}`}>
          <h1 className="text-3xl font-bold text-[#003366] dark:text-white">Chat Interno</h1>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 relative">
        
        {/* --- SIDEBAR DE CONTACTOS --- */}
        <div className={`
            absolute md:static inset-0 z-20 bg-white dark:bg-slate-800 md:w-80 flex flex-col border-r border-slate-100 dark:border-slate-700 transition-transform duration-300
            ${showSidebarMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#003366] outline-none dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredUsers.map((u) => {
               // Find last message
               const lastMsg = [...messages].reverse().find(m => 
                 (m.receiverId === u.id || m.senderId === u.id) || (u.id === 'general' && m.receiverId === 'general')
               );

               return (
                <div 
                  key={u.id} 
                  onClick={() => handleChatSelect(u.id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${activeChatId === u.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-l-[#003366] dark:border-l-blue-500' : ''}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${u.id === 'general' ? 'bg-[#003366]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      {u.id === 'general' ? '#' : u.name.charAt(0)}
                    </div>
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-slate-800 dark:text-white truncate">{u.name}</p>
                      {lastMsg && <span className="text-[10px] text-slate-400">{lastMsg.timestamp.toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'})}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px] opacity-80">
                         {isRecording && activeChatId === u.id ? (
                           <span className="text-green-600 font-bold italic">Gravando áudio...</span>
                         ) : (
                           lastMsg ? (lastMsg.type === 'image' ? '📷 Imagem' : lastMsg.type === 'audio' ? '🎤 Áudio' : lastMsg.content) : 'Inicie uma conversa'
                         )}
                       </p>
                       {lastMsg?.senderId === currentUser?.id && activeChatId !== u.id && (
                          <div className="ml-2">{renderMessageStatus(lastMsg)}</div>
                       )}
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* --- ÁREA PRINCIPAL DO CHAT --- */}
        <div className="flex-1 flex flex-col bg-[#e5ddd5]/10 dark:bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
          
          {/* Header */}
          <div className="p-3 md:p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm z-10">
             <div className="flex items-center gap-3">
               <button 
                 className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400"
                 onClick={() => setShowSidebarMobile(true)}
               >
                 <ChevronLeft size={24} />
               </button>
               
               <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${activeUser?.id === 'general' ? 'bg-[#003366]' : 'bg-slate-400'}`}>
                    {activeUser?.id === 'general' ? '#' : activeUser?.name.charAt(0)}
                  </div>
               </div>
               <div>
                 <h3 className="font-bold text-slate-800 dark:text-white leading-tight">{activeUser?.name}</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400">
                   {activeUser?.isOnline ? <span className="text-green-600 dark:text-green-400 font-bold">Online</span> : activeUser?.lastSeen}
                 </p>
               </div>
             </div>
             <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><Search size={20} /></button>
                <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><MoreVertical size={20} /></button>
             </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
             {currentMessages.map((msg) => {
               const isMe = msg.senderId === currentUser?.id;
               return (
                 <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div 
                      className={`
                        relative max-w-[85%] md:max-w-[65%] p-3 rounded-2xl shadow-sm text-sm cursor-pointer
                        ${isMe 
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-white rounded-tr-none hover:bg-[#cbfbc3] dark:hover:bg-[#004d3f]' 
                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-tl-none hover:bg-slate-50 dark:hover:bg-slate-600'}
                      `}
                      onClick={() => setViewDetailsMessageId(msg.id)}
                    >
                       {!isMe && activeUser?.id === 'general' && (
                         <p className="text-[10px] font-bold text-orange-600 mb-1">{MOCK_USERS.find(u => u.id === msg.senderId)?.name}</p>
                       )}
                       
                       <div className="mb-1">
                         {renderMessageContent(msg)}
                       </div>

                       <div className="flex justify-end items-center gap-1 mt-1 select-none">
                          <span className="text-[9px] text-slate-500 dark:text-slate-300 opacity-80">
                            {msg.timestamp.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && renderMessageStatus(msg)}
                       </div>
                    </div>
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-white dark:bg-slate-800 z-10 flex items-end gap-2">
             {/* Attachments Menu */}
             <div className="relative">
                {showAttachMenu && (
                  <div className="absolute bottom-14 left-0 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-100 dark:border-slate-600 p-2 flex flex-col gap-2 animate-fade-slide-up min-w-[150px]">
                     <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg cursor-pointer text-slate-600 dark:text-white">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><FileText size={18} /></div>
                        <span className="text-sm font-medium">Documento</span>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'file')} />
                     </label>
                     <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg cursor-pointer text-slate-600 dark:text-white">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-full"><Camera size={18} /></div>
                        <span className="text-sm font-medium">Câmera</span>
                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'image')} />
                     </label>
                     <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg cursor-pointer text-slate-600 dark:text-white">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><ImageIcon size={18} /></div>
                        <span className="text-sm font-medium">Galeria</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                     </label>
                  </div>
                )}
                <button 
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`p-3 rounded-full transition-all ${showAttachMenu ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-white' : 'text-slate-400 hover:text-[#003366] dark:hover:text-blue-400'}`}
                >
                  <Paperclip size={24} className={showAttachMenu ? 'rotate-45' : ''} />
                </button>
             </div>

             <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center p-1 px-3 min-h-[50px]">
                {isRecording ? (
                   <div className="flex-1 flex items-center justify-between text-red-500 animate-pulse px-2">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                         <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
                      </div>
                      <span className="text-xs uppercase font-bold tracking-widest">Gravando...</span>
                   </div>
                ) : (
                   <textarea 
                     value={inputText}
                     onChange={e => setInputText(e.target.value)}
                     onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                     placeholder="Escreva uma mensagem..."
                     className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-white text-sm resize-none max-h-32 py-3 placeholder-slate-400 dark:placeholder-slate-500"
                     rows={1}
                   />
                )}
             </div>

             {/* Action Button (Mic or Send) */}
             {inputText.trim() || showAttachMenu ? (
               <button 
                 onClick={() => handleSendMessage()}
                 className="p-3 bg-[#003366] text-white rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all"
               >
                 <Send size={20} />
               </button>
             ) : isRecording ? (
               <div className="flex gap-2">
                  <button onClick={cancelRecording} className="p-3 bg-slate-200 dark:bg-slate-600 text-red-500 rounded-full hover:bg-slate-300 dark:hover:bg-slate-500">
                     <Trash2 size={20} />
                  </button>
                  <button onClick={toggleRecording} className="p-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 animate-pulse">
                     <Send size={20} />
                  </button>
               </div>
             ) : (
               <button 
                 onClick={toggleRecording}
                 className="p-3 bg-[#003366] text-white rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all"
               >
                 <Mic size={20} />
               </button>
             )}
          </div>

          {/* Details Modal (Dynamic Message Info) */}
          {viewDetailsMessageId && selectedMessage && (
             <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in" onClick={() => setViewDetailsMessageId(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                   <button onClick={() => setViewDetailsMessageId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={20} />
                   </button>
                   
                   <h3 className="font-bold text-[#003366] dark:text-white mb-4 text-lg">Detalhes da Mensagem</h3>
                   
                   <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl mb-6 text-sm text-slate-600 dark:text-slate-300 italic border-l-4 border-slate-300 dark:border-slate-600 shadow-inner">
                      "{selectedMessage.type === 'text' 
                          ? (selectedMessage.content.length > 50 ? selectedMessage.content.substring(0, 50) + '...' : selectedMessage.content) 
                          : selectedMessage.type === 'image' ? 'Imagem' : selectedMessage.type === 'audio' ? 'Áudio' : 'Arquivo'}"
                   </div>

                   <div className="space-y-5">
                      {/* Lida */}
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                         <span className="text-slate-500 dark:text-slate-400 font-medium">Lida</span>
                         <div className="flex items-center gap-2 font-bold">
                            {selectedMessage.status === 'read' ? (
                                <div className="flex items-center gap-2 text-blue-500">
                                    <CheckCheck size={18} /> 
                                    <span>{new Date(selectedMessage.timestamp.getTime() + 300000).toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                            ) : (
                                <span className="text-slate-400 font-normal">-</span>
                            )}
                         </div>
                      </div>

                      {/* Entregue */}
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                         <span className="text-slate-500 dark:text-slate-400 font-medium">Entregue</span>
                         <div className="flex items-center gap-2 font-medium">
                            {(selectedMessage.status === 'delivered' || selectedMessage.status === 'read') ? (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <CheckCheck size={18} /> 
                                    <span>{new Date(selectedMessage.timestamp.getTime() + 60000).toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                            ) : (
                                <span className="text-slate-400 font-normal">-</span>
                            )}
                         </div>
                      </div>

                      {/* Enviada */}
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-slate-500 dark:text-slate-400 font-medium">Enviada</span>
                         <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                            <Check size={18} /> 
                            <span>{selectedMessage.timestamp.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </div>
                   </div>
                   
                   <button 
                     onClick={() => setViewDetailsMessageId(null)}
                     className="w-full mt-8 py-3 bg-[#003366] font-bold text-white rounded-xl hover:bg-blue-900 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Fechar
                   </button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Chat;
