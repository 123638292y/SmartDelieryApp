import {
    LayoutDashboard,
    LogIn,
    LogOut,
    Menu,
    Truck,
    UserCircle,
    UserPlus,
    X
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthAdmin } from '../../Contexts/AuthContext';

// On ajoute { children } ici pour recevoir le contenu du dashboard
const Sidebar = ({ children }) => {
  const { isAuthenticated, logout, admin } = useAuthAdmin();
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

const menuItems = [
  { name: 'Ajouter Livreur', path: '/drivers', icon: <UserPlus size={20} /> }, // Change /drivers/new par /drivers
  { name: 'Affectations', path: '/deliveries/assign', icon: <Truck size={20} /> },
  { name: 'Mon Profil', path: '/profile', icon: <UserCircle size={20} /> },
];


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Bouton Menu Mobile */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Barre Latérale (Fixe) */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-900 text-white transition-all duration-300 z-40 
        ${isOpen ? 'w-64' : 'w-20'}`}>
        
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center mb-10 mt-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck size={24} className="text-white" />
            </div>
            {isOpen && <span className="ml-3 font-bold text-xl tracking-tight">SmartMarket</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors
                  ${location.pathname === item.path 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                {item.icon}
                {isOpen && <span className="ml-4 font-medium">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="border-t border-slate-800 pt-4">
            {isAuthenticated ? (
              <>
                {isOpen && (
                  <div className="mb-4 px-2">
                    <p className="text-xs text-slate-500 uppercase">Administrateur</p>
                    <p className="text-sm font-medium truncate text-white">{admin?.first_name} {admin?.last_name}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  {isOpen && <span className="ml-4 font-medium">Déconnexion</span>}
                </button>
              </>
            ) : (
              <Link to="/login" className="w-full flex items-center p-3 text-green-400 hover:bg-green-500/10 rounded-lg">
                <LogIn size={20} />
                {isOpen && <span className="ml-4 font-medium">Connexion</span>}
              </Link>
            )}
            
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="hidden lg:flex mt-4 w-full items-center justify-center p-2 text-slate-500 hover:text-white"
            >
              {isOpen ? 'Réduire' : '»'}
            </button>
          </div>
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPAL */}
      {/* On ajoute une marge à gauche égale à la largeur de la sidebar pour ne pas que le contenu soit caché dessous */}
      <main className={`flex-1 transition-all duration-300 p-8 ${isOpen ? 'ml-64' : 'ml-20'}`}>
        {children}
      </main>
    </div>
  );
};

export default Sidebar;