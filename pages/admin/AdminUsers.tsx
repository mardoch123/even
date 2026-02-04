
import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Ban, CheckCircle, Download, Shield, Key, Eye, Filter, Trash2, X, User as UserIcon, Mail, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';

const INITIAL_USERS = [
    { id: 'u1', name: 'Jean Dupont', email: 'jean@demo.com', role: 'Client', status: 'active', joinDate: '2024-01-15', reports: 0 },
    { id: 'u2', name: 'DJ Magic', email: 'dj@event.com', role: 'Provider', status: 'active', kyc: 'verified', joinDate: '2024-02-20', reports: 1 },
    { id: 'u3', name: 'Spammer User', email: 'spam@bot.com', role: 'Client', status: 'suspended', joinDate: '2024-05-10', reports: 12 },
    { id: 'u4', name: 'Traiteur Délice', email: 'contact@delice.fr', role: 'Provider', status: 'pending_kyc', kyc: 'pending', joinDate: '2024-06-01', reports: 0 },
    { id: 'u5', name: 'Sophie Martin', email: 'sophie@test.com', role: 'Client', status: 'active', joinDate: '2024-06-10', reports: 0 },
];

export const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'provider' | 'client' | 'banned'>('all');
  
  // Initialize state from storage immediately to prevent flash or sync issues
  const [users, setUsers] = useState<any[]>(() => {
      const stored = localStorage.getItem('admin_users_list');
      return stored ? JSON.parse(stored) : INITIAL_USERS;
  });
  
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Helper to update state and storage
  const updateUsers = (newUsers: any[]) => {
      setUsers(newUsers);
      localStorage.setItem('admin_users_list', JSON.stringify(newUsers));
  };

  const filteredUsers = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'provider') matchesTab = user.role === 'Provider';
      if (activeTab === 'client') matchesTab = user.role === 'Client';
      if (activeTab === 'banned') matchesTab = user.status === 'suspended' || user.status === 'banned';

      return matchesSearch && matchesTab;
  });

  const handleAction = (id: string, action: 'ban' | 'activate' | 'validate_kyc' | 'delete' | 'view_profile' | 'reset_password') => {
      const user = users.find(u => u.id === id);
      let newUsers = [...users];
      
      if (action === 'view_profile') {
          setSelectedUser(user);
          setActionMenuOpen(null);
          return;
      }

      if (action === 'reset_password') {
          if (confirm(`Envoyer un lien de réinitialisation de mot de passe à ${user?.email} ?`)) {
              // Simulation d'appel API
              setTimeout(() => {
                  alert(`Un email de réinitialisation a été envoyé avec succès à ${user?.email}.`);
              }, 500);
          }
          setActionMenuOpen(null);
          return;
      }
      
      if (action === 'ban') {
          newUsers = newUsers.map(u => u.id === id ? { ...u, status: 'banned' } : u);
      }
      if (action === 'activate') {
          newUsers = newUsers.map(u => u.id === id ? { ...u, status: 'active' } : u);
      }
      if (action === 'validate_kyc') {
          newUsers = newUsers.map(u => u.id === id ? { ...u, status: 'active', kyc: 'verified' } : u);
      }
      if (action === 'delete') {
          if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur définitivement ?")) {
            newUsers = newUsers.filter(u => u.id !== id);
          } else {
            setActionMenuOpen(null);
            return;
          }
      }
      
      updateUsers(newUsers);
      setActionMenuOpen(null);
  };

  const handleExport = () => {
      const csvContent = "data:text/csv;charset=utf-8," + 
          "ID,Name,Email,Role,Status,JoinDate\n" +
          users.map(e => `${e.id},${e.name},${e.email},${e.role},${e.status},${e.joinDate}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "users_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion Utilisateurs</h1>
                <p className="text-gray-500">Gérez les {users.length} comptes de la plateforme.</p>
            </div>
            <Button variant="outline" onClick={handleExport}>
                <Download size={18} className="mr-2" /> Exporter CSV
            </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
            {/* Toolbar & Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-1 p-2 overflow-x-auto">
                    {['all', 'provider', 'client', 'banned'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                                activeTab === tab 
                                ? 'bg-gray-900 text-white' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab === 'all' ? 'Tous' : tab === 'banned' ? 'Suspendus' : tab + 's'}
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher par nom ou email..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
                        <Filter size={16} /> {filteredUsers.length} résultats
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-400 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4">Utilisateur</th>
                            <th className="px-6 py-4">Rôle</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4">Signalements</th>
                            <th className="px-6 py-4">Date d'inscription</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 border border-gray-200">
                                            {(user.name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1 ${
                                        user.role === 'Provider' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                        {user.role === 'Provider' && <Shield size={10} />} {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.status === 'active' && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Actif
                                        </span>
                                    )}
                                    {(user.status === 'banned' || user.status === 'suspended') && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full w-fit">
                                            <Ban size={12} /> Suspendu
                                        </span>
                                    )}
                                    {user.status === 'pending_kyc' && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full w-fit">
                                            En attente KYC
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {user.reports > 0 ? (
                                        <span className="text-red-600 font-bold">{user.reports} alerte(s)</span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-medium">{user.joinDate}</td>
                                <td className="px-6 py-4 text-right relative">
                                    <button 
                                        onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {actionMenuOpen === user.id && (
                                        <div className="absolute right-10 top-8 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 text-left">
                                            <div className="py-1">
                                                <button 
                                                    onClick={() => handleAction(user.id, 'view_profile')}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                                >
                                                    <Eye size={14} /> Voir détails
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(user.id, 'reset_password')}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                                >
                                                    <Key size={14} /> Reset Password
                                                </button>
                                                
                                                {user.status === 'pending_kyc' && (
                                                    <button 
                                                        onClick={() => handleAction(user.id, 'validate_kyc')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 flex items-center gap-2 text-green-700 font-medium"
                                                    >
                                                        <CheckCircle size={14} /> Valider KYC
                                                    </button>
                                                )}

                                                {(user.status === 'banned' || user.status === 'suspended') ? (
                                                    <button 
                                                        onClick={() => handleAction(user.id, 'activate')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 flex items-center gap-2 text-green-700"
                                                    >
                                                        <CheckCircle size={14} /> Réactiver
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAction(user.id, 'ban')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex items-center gap-2 text-orange-700"
                                                    >
                                                        <Ban size={14} /> Suspendre
                                                    </button>
                                                )}
                                                
                                                <div className="border-t border-gray-100 mt-1"></div>
                                                <button 
                                                    onClick={() => handleAction(user.id, 'delete')}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                                >
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-center">
                Fin de la liste des utilisateurs
            </div>
        </div>

        {/* USER DETAIL MODAL */}
        {selectedUser && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Fiche Utilisateur</h3>
                        <button 
                            onClick={() => setSelectedUser(null)}
                            className="p-2 rounded-full hover:bg-gray-200 text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                {(selectedUser.name || 'U').charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                                <p className="text-gray-500">{selectedUser.email}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${selectedUser.role === 'Provider' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                        {selectedUser.role}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 border border-gray-200 text-gray-600">
                                        ID: {selectedUser.id}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Membre depuis</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedUser.joinDate}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-orange-400" size={20} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Signalements</p>
                                        <p className={`text-sm font-medium ${selectedUser.reports > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {selectedUser.reports} incident(s)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedUser.role === 'Client' && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><UserIcon size={16}/> Activité Client</h4>
                                    <ul className="text-sm text-blue-900/80 space-y-1 list-disc list-inside">
                                        <li>Dernière connexion : Aujourd'hui</li>
                                        <li>Commandes effectuées : 3 (Simulé)</li>
                                        <li>Avis laissés : 2</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setSelectedUser(null)}>Fermer</Button>
                        {selectedUser.role === 'Provider' && (
                            <Button variant="outline" onClick={() => navigate(`/provider/${selectedUser.id}`)}>
                                Voir Profil Public
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
