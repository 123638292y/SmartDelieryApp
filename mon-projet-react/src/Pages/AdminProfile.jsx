import { useEffect, useState } from 'react';
import Layout from '../components/layout/Sidebar';
import { useAuthAdmin } from '../Contexts/AuthContext';

const AdminProfile = () => {
  // On récupère 'admin' (ou 'driver') et la fonction 'updateProfile' du contexte
  const { admin, updateProfile } = useAuthAdmin();
  
  const [formData, setFormData] = useState({
    id_driver: '', // Nécessaire pour le backend
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '' // Pour la validation locale uniquement
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les données de l'utilisateur au montage
  useEffect(() => {
    if (admin) {
      setFormData((prev) => ({
        ...prev,
        id_driver: admin.id || '',
        first_name: admin.first_name || '',
        last_name: admin.last_name || '',
        email: admin.email || '',
        phone: admin.phone || ''
      }));
    }
  }, [admin]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    // Validation locale du nouveau mot de passe
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      setIsSubmitting(false);
      return;
    }

    // Préparation des données pour le backend (on n'envoie pas confirmPassword)
    const { confirmPassword, ...payload } = formData;

    const res = await updateProfile(payload);

    if (res.success) {
      setStatus({ type: 'success', message: 'Profil mis à jour avec succès !' });
      // Optionnel : vider les champs de mot de passe après succès
      setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' }));
    } else {
      setStatus({ type: 'error', message: res.message || 'Une erreur est survenue.' });
    }
    setIsSubmitting(false);
  };

  return (
    <Layout>
      <div className="p-6 bg-gray-50 min-h-screen flex justify-center items-start">
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-md overflow-hidden mt-10">
          <div className="bg-blue-600 p-6">
            <h2 className="text-2xl font-bold text-white">Mon Profil</h2>
            <p className="text-blue-100">Gérez vos informations et votre sécurité</p>
          </div>

          <div className="p-8">
            {status.message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center ${
                status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {status.type === 'success' ? '✅' : '❌'} <span className="ml-2">{status.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section Informations Personnelles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Section Sécurité / Mot de passe */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Changer le mot de passe</h3>
                <p className="text-sm text-gray-500 mb-4 italic">Laissez vide si vous ne souhaitez pas modifier le mot de passe.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ancien mot de passe</label>
                    <input
                      type="password"
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="Indispensable pour changer de mot de passe"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-lg font-bold text-white transition shadow-lg ${
                    isSubmitting 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-95'
                  }`}
                >
                  {isSubmitting ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminProfile;