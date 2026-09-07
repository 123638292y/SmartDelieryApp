import { useEffect, useState } from 'react';
import Layout from '../components/layout/Sidebar';
import { statsService } from '../services/api';

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [driversPerf, setDriversPerf] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        const [dash, glob, perf, evol, clients] = await Promise.all([
          statsService.getDashboardSummary(),
          statsService.getGlobalStats(),
          statsService.getDriversPerformance(),
          statsService.getMonthlyEvolution(),
          statsService.getTopClients()
        ]);

        // On vérifie si les données sont bien des tableaux, sinon on met un tableau vide
        setDashboardData(dash);
        setGlobalStats(glob);
        setDriversPerf(Array.isArray(perf) ? perf : (perf?.data || []));
        setEvolution(Array.isArray(evol) ? evol : (evol?.data || []));
        setTopClients(Array.isArray(clients) ? clients : (clients?.data || []));

      } catch (error) {
        console.error("Erreur lors de la récupération des stats:", error);
        // On initialise avec des tableaux vides en cas d'erreur pour éviter le crash du .map()
        setDriversPerf([]);
        setEvolution([]);
        setTopClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen text-xl font-semibold">
          Chargement des statistiques...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Tableau de Bord Statistiques</h1>

        {/* Section Summary - Dashboard Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Livraisons" value={dashboardData?.totalDeliveries || 0} icon="📦" color="bg-blue-500" />
          <StatCard title="Livreurs Actifs" value={dashboardData?.activeDrivers || 0} icon="🚚" color="bg-green-500" />
          <StatCard title="En Attente" value={dashboardData?.pendingDeliveries || 0} icon="⏳" color="bg-yellow-500" />
          <StatCard title="Taux de Réussite" value={`${dashboardData?.successRate || 0}%`} icon="✅" color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Performance des Livreurs */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">Performance des Livreurs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-sm">
                    <th className="pb-3">Livreur</th>
                    <th className="pb-3 text-center">Livraisons</th>
                    <th className="pb-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {driversPerf.length > 0 ? (
                    driversPerf.map((driver, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3 font-medium text-gray-800">{driver.nom || driver.nom_livreur}</td>
                        <td className="py-3 text-center text-gray-600">{driver.count}</td>
                        <td className="py-3 text-center">
                           <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                            {driver.performance}%
                           </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="text-center py-4 text-gray-400">Aucune donnée disponible</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">Top Clients</h2>
            <div className="space-y-4">
              {topClients.length > 0 ? (
                topClients.map((client, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-700">{client.nom_client}</span>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      {client.total_commandes} commandes
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400">Aucun client trouvé</p>
              )}
            </div>
          </div>

          {/* Evolution Mensuelle */}
          <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">Évolution Mensuelle</h2>
            <div className="flex items-end justify-around h-48 pt-4">
              {evolution.length > 0 ? (
                evolution.map((item, index) => {
                  const maxCount = Math.max(...evolution.map(e => e.count), 1);
                  return (
                    <div key={index} className="flex flex-col items-center w-full">
                      <div 
                        className="bg-blue-400 w-12 rounded-t-md transition-all duration-500 hover:bg-blue-600" 
                        style={{ height: `${(item.count / maxCount) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2 rotate-45 lg:rotate-0">{item.month || item.mois}</span>
                      <span className="text-xs font-bold text-gray-700">{item.count}</span>
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-400">Pas de données d'évolution</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
    <div className={`${color} text-white p-4 rounded-lg text-2xl shadow-lg`}>
      {icon}
    </div>
  </div>
);

export default DashboardStats;