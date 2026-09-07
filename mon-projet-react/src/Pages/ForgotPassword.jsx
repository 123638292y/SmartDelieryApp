import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthAdmin } from '../Contexts/AuthContext';

const ForgotPassword = () => {
  const { forgotPassword } = useAuthAdmin();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        // Redirection vers la page de reset avec l'email en paramètre
        navigate('/reset-password', { state: { email } });
      }
    } catch (err) {
      setError(err.message || "Email introuvable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
            <Send size={30} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Mot de passe oublié ?</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Entrez votre adresse email pour recevoir un code de réinitialisation.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border-l-4 border-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Admin</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
            Envoyer le code
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft size={16} className="mr-2" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;