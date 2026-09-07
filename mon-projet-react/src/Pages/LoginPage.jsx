import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthAdmin } from '../Contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuthAdmin();
  const navigate = useNavigate();

  // États locaux
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Redirection vers le dashboard après 1 seconde pour l'effet visuel
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } else {
      setError(result.message || "Identifiants invalides");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* En-tête / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Admin SmartMarket</h1>
          <p className="text-slate-500 mt-2 text-sm">Connectez-vous pour gérer vos livraisons</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center">
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@cashmarket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
              <Link to="/forgot-password" size="sm" className="text-xs text-blue-600 hover:underline font-medium">
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        {/* Pied de page */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Accès sécurisé CashMarket
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;