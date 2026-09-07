import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/layout/Sidebar';
import { driverService } from '../services/api';

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  
  const [formData, setFormData] = useState({ 
    first_name: '', 
    last_name: '', 
    identification_no: '' 
  });

  // Utilisation de useCallback pour éviter de recréer la fonction à chaque render
  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await driverService.getAllDrivers();
      // On s'adapte à la structure de ta réponse API
      setDrivers(response.data || response || []);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // On charge les données au montage du composant
  // Plus besoin de vérifier le token ici, car PrivateRoute s'en occupe dans App.js
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleIdChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 5) {
      setFormData({ ...formData, identification_no: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await driverService.updateDriver(editingDriver.id, formData);
      } else {
        await driverService.createDriver(formData);
      }
      closeModal();
      fetchDrivers();
    } catch (error) {
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Supprimer le livreur #${id} ?`)) {
      try {
        await driverService.deleteDriver(id);
        fetchDrivers();
      } catch (error) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  const openModal = (driver = null) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({ 
        first_name: driver.first_name, 
        last_name: driver.last_name, 
        identification_no: driver.identification_no || ''
      });
    } else {
      setEditingDriver(null);
      setFormData({ first_name: '', last_name: '', identification_no: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
  };

  return (
   <Layout>

    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Livreurs</h1>
          <p className="text-sm text-gray-500">Liste des chauffeurs enregistrés (ID max: 5 chiffres)</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-sm transition"
        >
          + Ajouter un Livreur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600 w-20">ID</th>
              <th className="p-4 font-semibold text-gray-600">Prénom</th>
              <th className="p-4 font-semibold text-gray-600">Nom</th>
              <th className="p-4 font-semibold text-gray-600">N° Identification</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-10 text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
                    <span className="text-gray-400">Chargement des données...</span>
                  </div>
                </td>
              </tr>
            ) : drivers.length > 0 ? (
              drivers.map((driver) => (
                <tr key={driver.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4 text-gray-400 font-mono text-sm">#{driver.id}</td>
                  <td className="p-4 text-gray-700">{driver.first_name}</td>
                  <td className="p-4 text-gray-900 font-bold uppercase">{driver.last_name}</td>
                  <td className="p-4 font-mono text-blue-600 font-medium">{driver.identification_no}</td>
                  <td className="p-4">
                    <div className="flex justify-center space-x-3">
                      <button onClick={() => openModal(driver)} className="text-blue-600 hover:scale-125 transition">✏️</button>
                      <button onClick={() => handleDelete(driver.id)} className="text-red-600 hover:scale-125 transition">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="p-10 text-center text-gray-500">Aucun livreur trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {editingDriver ? `Modifier le Livreur #${editingDriver.id}` : 'Nouveau Livreur'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prénom</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    N° d'identification (Max 5 chiffres)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength="5"
                  placeholder="Ex: 12345"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.identification_no}
                  onChange={handleIdChange}
                />
                <p className="text-[10px] text-gray-400 mt-1">Saisie limitée à 5 chiffres.</p>
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
                  {editingDriver ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
        </Layout>

  );
};

export default DriversPage;