import { useCallback, useEffect, useState } from 'react';
import { affectationService } from '../services/api';

const DriverDeliveriesList = ({ driverId = null, onUnassignSuccess }) => {
    const [driversData, setDriversData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchName] = useState('');

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            // Appelle l'API avec l'ID (ou vide pour tout récupérer)
            const res = await affectationService.getDeliveriesPerDriver(driverId || '');
            setDriversData(res.data || []);
        } catch (error) {
            console.error("Erreur lors de la récupération des tournées:", error);
        } finally {
            setLoading(false);
        }
    }, [driverId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleUnassign = async (docId) => {
        if (!window.confirm("Retirer cette livraison de la tournée ?")) return;
        try {
            await affectationService.unassignDelivery(docId);
            refreshData(); 
            if (onUnassignSuccess) onUnassignSuccess(); 
        } catch (error) {
            alert("Erreur lors de la désaffectation");
        }
    };

    const filteredDrivers = driversData.filter(item => 
        item.driver.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-500 font-medium">Chargement des données...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Barre de recherche */}
            {!driverId && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Rechercher un livreur..." 
                            value={searchTerm}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    <button 
                        onClick={refreshData}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition"
                    >
                        🔄 Actualiser
                    </button>
                </div>
            )}

            <div className="space-y-4">
                {filteredDrivers.length > 0 ? filteredDrivers.map((item) => (
                    <div key={item.driver.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold mr-4">
                                    {item.driver.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{item.driver.full_name}</h3>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                        ID: {item.driver.id} • Matrimicule: {item.driver.identification || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                                <span className="text-sm font-bold text-gray-600 mr-2">Charge :</span>
                                <span className={`text-sm font-black ${item.total_deliveries > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {item.total_deliveries} Livraison(s)
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {item.deliveries.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Bon N°</th>
                                            <th className="px-6 py-3">Client & Destination</th>
                                            <th className="px-6 py-3">Date Prévue</th>
                                            <th className="px-6 py-3">Statut</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {item.deliveries.map((del) => (
                                            <tr key={del.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-700">{del.no_doc}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-gray-800">{del.client}</div>
                                                    <div className="text-xs text-gray-400">{del.address}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {del.date ? new Date(del.date).toLocaleDateString() : 'Non définie'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                                                        del.status === 'P' ? 'bg-blue-100 text-blue-700' : 
                                                        del.status === 'T' ? 'bg-green-100 text-green-700' : 
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {del.status === 'P' ? 'En cours' : del.status === 'T' ? 'Livré' : 'Attente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleUnassign(del.id)}
                                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-8 text-center text-gray-400 italic text-sm">Aucune livraison.</div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-300 text-center text-gray-400 font-medium">
                        Aucune donnée trouvée.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDeliveriesList;