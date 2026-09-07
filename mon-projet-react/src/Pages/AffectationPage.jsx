import { useCallback, useEffect, useState } from 'react';
import DriverDeliveriesList from '../components/DriverDeliveriesList'; // Import de ton composant
import Layout from '../components/layout/Sidebar';
import { affectationService } from '../services/api';

const AffectationPage = () => {
    // États pour le formulaire et les données
    const [idDriver, setIdDriver] = useState('');
    const [idDoc, setIdDoc] = useState('');
    const [allDeliveries, setAllDeliveries] = useState([]); // Pour l'onglet "Tous les bons"
    const [driversList, setDriversList] = useState([]); // Liste simple des livreurs (pour les <select>)
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [isAutoLoading, setIsAutoLoading] = useState(false);

    // Chargement initial des données globales
    const loadGlobalData = useCallback(async () => {
        setLoading(true);
        try {
            const [delivRes, driversRes] = await Promise.all([
                affectationService.getAllDeliveries(),
                affectationService.getAllDrivers()
            ]);
            
            setAllDeliveries(delivRes.data || []);
            setDriversList(driversRes.data || []);
        } catch (error) {
            console.error("Erreur chargement global:", error);
            setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGlobalData();
    }, [loadGlobalData]);

    // Action : Affectation manuelle
    const handleAssign = async (e) => {
        e.preventDefault();
        if (!idDoc || !idDriver) return;
        
        try {
            await affectationService.assignDelivery(idDoc, idDriver);
            setMessage({ type: 'success', text: 'Affectation réussie' });
            setIdDoc(''); // Reset le choix du bon
            loadGlobalData(); // Rafraîchir la liste globale des bons
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Erreur lors de l’affectation' });
        }
    };

    // Action : Affectation automatique (IA)
    const handleAutoAssign = async () => {
        setIsAutoLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await affectationService.autoAssignDeliveries();
            setMessage({ type: 'success', text: res.message || 'Affectation IA terminée' });
            loadGlobalData();
        } catch (error) {
            setMessage({ type: 'error', text: error.error || 'Erreur lors de l’affectation automatique' });
        } finally {
            setIsAutoLoading(false);
        }
    };

    // Fonction appelée quand une désaffectation réussit dans le composant enfant
    const onActionSuccess = () => {
        loadGlobalData();
    };

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto">
            

                {/* Tabs Navigation */}
                <div className="flex space-x-2 mb-8 bg-gray-100 p-1.5 rounded-xl w-fit">
                    {[
                        { id: 'dashboard', label: 'Assignation', icon: '🎯' },
                        { id: 'deliveries', label: 'Tous les bons', icon: '📦' },
                        { id: 'drivers', label: 'Suivi par Livreur', icon: '🚚' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center transition-all ${
                                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Message Banner */}
                {message.text && (
                    <div className={`p-4 mb-6 rounded-xl border-l-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 ${
                        message.type === 'success' ? 'bg-green-50 text-green-800 border-green-500' : 'bg-red-50 text-red-800 border-red-500'
                    }`}>
                        <span className="font-medium">{message.type === 'success' ? '✅' : '⚠️'} {message.text}</span>
                        <button onClick={() => setMessage({type:'', text:''})} className="text-2xl hover:opacity-70">&times;</button>
                    </div>
                )}

                {/* --- TAB: DASHBOARD (ASSIGNATION MANUELLE) --- */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Formulaire à gauche */}
                        <div className="lg:col-span-4 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm h-fit">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3 text-base">📝</span>
                                Nouvelle Affectation
                            </h3>
                            <form onSubmit={handleAssign} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Livreur</label>
                                    <select 
                                        value={idDriver} 
                                        onChange={(e) => setIdDriver(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        required
                                    >
                                        <option value="">Sélectionner un livreur...</option>
                                        {driversList.map(dr => (
                                            <option key={dr.id} value={dr.id}>{dr.first_name} {dr.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">Bon de Livraison</label>
                                    <select 
                                        value={idDoc} 
                                        onChange={(e) => setIdDoc(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        required
                                    >
                                        <option value="">Choisir un bon en attente...</option>
                                        {allDeliveries.filter(d => !d.driver_id).map(d => (
                                            <option key={d.id} value={d.id}>N°{d.no_doc} - {d.client_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                                    Valider l'affectation
                                </button>
                            </form>
                        </div>

                        {/* Visualisation de la tournée du livreur sélectionné à droite */}
                        <div className="lg:col-span-8">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Aperçu de la tournée</h3>
                                {idDriver && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Livreur #{idDriver}</span>}
                            </div>
                            {idDriver ? (
                                <DriverDeliveriesList 
                                    driverId={idDriver} 
                                    onUnassignSuccess={onActionSuccess}
                                />
                            ) : (
                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
                                    <div className="text-4xl mb-4">🚚</div>
                                    <p className="text-gray-400 font-medium">Sélectionnez un livreur à gauche pour voir et gérer son planning de livraison.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: ALL DELIVERIES (VUE GLOBALE) --- */}
                {activeTab === 'deliveries' && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">Registre Global des Livraisons</h3>
                            <p className="text-xs text-gray-500">Liste complète des bons de livraison et leur état d'affectation</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">N° Document</th>
                                        <th className="px-6 py-4">Client / Destination</th>
                                        <th className="px-6 py-4 text-center">Statut</th>
                                        <th className="px-6 py-4">Livreur Affecté</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allDeliveries.map((d) => (
                                        <tr key={d.id} className="hover:bg-gray-50 transition text-sm">
                                            <td className="px-6 py-4 font-bold text-gray-900">{d.no_doc}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-800">{d.client_name}</div>
                                                <div className="text-xs text-gray-400 font-medium">{d.adr1}, {d.ville}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${d.status === 'P' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {d.status === 'P' ? 'Affecté' : 'En attente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {d.driver_id ? (
                                                    <div className="flex items-center text-indigo-600 font-bold">
                                                        <span className="mr-2">👤</span> {d.driver_firstname} {d.driver_lastname}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic font-medium">Non assigné</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {d.driver_id ? (
                                                    <button 
                                                        onClick={() => {
                                                            if(window.confirm("Libérer ce bon ?")) {
                                                                affectationService.unassignDelivery(d.id).then(onActionSuccess);
                                                            }
                                                        }} 
                                                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Libérer
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => { setIdDoc(d.id); setActiveTab('dashboard'); }} 
                                                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Assigner
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {allDeliveries.length === 0 && !loading && (
                                        <tr><td colSpan="5" className="py-20 text-center text-gray-400">Aucun bon de livraison trouvé.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB: DRIVERS (SUIVI COMPLET AVEC RECHERCHE) --- */}
                {activeTab === 'drivers' && (
                    <DriverDeliveriesList onUnassignSuccess={onActionSuccess} />
                )}
            </div>
        </Layout>
    );
};

export default AffectationPage;