import { ArrowLeft, Hash, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthAdmin } from '../Contexts/AuthContext';

const ResetPassword = () => {
  const { resetPassword } = useAuthAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  // On récupère l'email s'il vient de la page précédente
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError("Les mots de passe ne correspondent pas");
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(email, code, newPassword);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setError(err.message || "Code invalide ou expiré");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-green-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Succès !</h2>
          <p className="text-slate-500 mt-2">Votre mot de passe a été réinitialisé. Vous allez être redirigé vers la page de connexion.</p>
          <Link to="/login" className="mt-6 inline-block text-blue-600 font-bold">Cliquer ici si vous n'êtes pas redirigé</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Réinitialisation</h1>
          <p className="text-slate-500 mt-2 text-sm">Saisissez le code reçu par email et votre nouveau mot de passe.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border-l-4 border-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Lecture seule si possible) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Code de vérification */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Code de vérification (6 chiffres)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Hash size={18} />
              </div>
              <input
                type="text"
                required
                maxLength="6"
                className="block w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          {/* Nouveau Mot de passe */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
            Réinitialiser le mot de passe
          </button>
        </form>

        <div className="mt-6 text-center">
            <Link to="/forgot-password" size="sm" className="text-xs text-blue-600 hover:underline font-medium flex items-center justify-center">
               <ArrowLeft size={12} className="mr-1"/> Renvoyer un code
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;