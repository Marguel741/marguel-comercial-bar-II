
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Footer from '../components/Footer';

const Register: React.FC = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', pin: '', confirmPin: '', phoneNumber: '' });
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.pin !== form.confirmPin) { setError('Os PINs não coincidem.'); return; }
    if (form.pin.length < 4) { setError('O PIN deve ter pelo menos 4 dígitos.'); return; }

    const result = await register({
      name: form.name,
      email: form.email,
      pin: form.pin,
      phoneNumber: form.phoneNumber
    });

    if (result.success) navigate('/pending-approval');
    else setError(result.message);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="bg-[#003366] py-12 px-6 rounded-b-[3rem] shadow-2xl">
        <div className="flex flex-col items-center animate-fade-in">
          <div className="mb-4 flex flex-col items-center">
            <span className="font-sans font-black text-4xl tracking-tighter text-[#E3007E]"
              style={{ filter: 'drop-shadow(0 0 16px rgba(227, 0, 126, 0.4))' }}>MG</span>
            <div className="w-12 h-[1px] bg-[#E3007E]/50 mt-1" />
          </div>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          <p className="text-white/70 text-sm mt-1">Marguel Mobile SGI</p>
        </div>
      </div>

      <div className="flex-1 px-6 -mt-6 pb-6">
        <div className="soft-ui p-8 dark:bg-slate-800 max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Nome Completo', field: 'name', type: 'text', icon: User, placeholder: 'Seu nome completo' },
              { label: 'E-mail', field: 'email', type: 'email', icon: Mail, placeholder: 'seu@email.com' },
              { label: 'Telefone (opcional)', field: 'phoneNumber', type: 'tel', icon: Phone, placeholder: '+244 XXX XXX XXX' },
            ].map(({ label, field, type, icon: Icon, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type={type} value={form[field as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-3.5 pl-11 pr-4 soft-ui-inset focus:ring-2 focus:ring-[#003366] dark:text-white"
                    required={field !== 'phoneNumber'} />
                </div>
              </div>
            ))}

            {[{ label: 'PIN de Acesso (4-8 dígitos)', field: 'pin' }, { label: 'Confirmar PIN', field: 'confirmPin' }].map(({ label, field }) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-bold text-[#003366] dark:text-blue-400 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={8}
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder="••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-3.5 pl-11 pr-11 soft-ui-inset focus:ring-2 focus:ring-[#003366] dark:text-white"
                    required />
                  {field === 'pin' && (
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium text-center">{error}</p>
            </div>}

            <button type="submit" disabled={isLoading}
              className="w-full pill-button py-4 bg-[#003366] text-white font-bold shadow-xl hover:opacity-95 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3 mt-2">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Criar Conta</span><ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#003366] dark:hover:text-blue-400 transition-colors text-sm font-medium">
              <ArrowLeft size={16} /> Já tenho conta
            </Link>
          </div>
        </div>
        <p className="text-center mt-4 text-sm text-slate-400 px-4">
          Após criar a conta, aguarda a aprovação do Administrador para aceder ao sistema.
        </p>
      </div>
      <Footer />
    </div>
  );
};
export default Register;
