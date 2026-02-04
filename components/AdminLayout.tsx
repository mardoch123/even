
import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, Calendar, LogOut, Home, CreditCard, FileText, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
      window.location.href = '/#/';
    }
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { path: '/admin/moderation', icon: ShieldAlert, label: 'Modération' },
    { path: '/admin/events', icon: Calendar, label: 'Événements & Paiements' },
    { path: '/admin/ads', icon: Megaphone, label: 'Publicités & Boost' },
    { path: '/admin/subscriptions', icon: CreditCard, label: 'Abonnements' },
    { path: '/admin/content', icon: FileText, label: 'Pages & Contenu' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-white/10 rounded-lg">
                  <Logo height={24} />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight ml-1">Admin</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Événéo Backoffice v1.0</p>
        </div>

        <nav className="flex-grow p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path) 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' 
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
           <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-all">
             <Home size={20} />
             <span>Retour au site</span>
           </Link>
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-900/30 text-red-400 transition-all"
           >
             <LogOut size={20} />
             <span>Déconnexion</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
             <Outlet />
        </div>
      </main>
    </div>
  );
};
