
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, ArrowLeft, MapPin, WifiOff, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { useConnectivity } from '../contexts/ConnectivityContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const { currentUser, updatePassword } = useAuth();
  const { isOnline, queueAction } = useConnectivity();
  const navigate = useNavigate();
  
  // Identity Fields
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Editable Fields
  const [address, setAddress] = useState('12 Rue de la Paix, 75002 Paris');
  const [bio, setBio] = useState('');
  
  // Security Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);

  const isProvider = currentUser?.role === UserRole.PROVIDER;
  // LOGIQUE D'EDITION DU NOM (Provider)
  // Autorisé si Client, OU si Provider avec KYC 'none' ou 'rejected'
  const kycStatus = currentUser?.kycStatus || 'none';
  const canEditName = !isProvider || (isProvider && (kycStatus === 'none' || kycStatus === 'rejected'));

  useEffect(() => {
      const storedAddress = localStorage.getItem('user_address');
      const storedBio = localStorage.getItem('user_bio');

      if (storedAddress) setAddress(storedAddress);
      if (storedBio) setBio(storedBio);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Password Update Logic
    if (newPassword) {
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
            setIsLoading(false);
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' });
            setIsLoading(false);
            return;
        }
        // Simulate API call for password update
        await updatePassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
    }

    const payload = {
        name: canEditName ? name : currentUser?.name,
        address,
        bio
    };

    queueAction('UPDATE_SETTINGS', payload, () => {
        setTimeout(() => {
            setIsLoading(false);
            
            // Persist basic user data locally for demo consistency
            if (canEditName && currentUser) {
                const updatedUser = { ...currentUser, name: name };
                localStorage.setItem('eveneo_user', JSON.stringify(updatedUser));
            }

            localStorage.setItem('user_address', address);
            localStorage.setItem('user_bio', bio);
            if (isProvider) {
                localStorage.setItem('provider_profile_completed', 'true');
            }
            
            if (isOnline) {
                setMessage({ type: 'success', text: 'Vos informations ont été mises à jour avec succès.' });
                // Force refresh to update navbar name if changed
                if (canEditName) window.location.reload();
            } else {
                setMessage({ type: 'info', text: 'Sauvegardé hors ligne. La synchronisation se fera au retour de la connexion.' });
            }
        }, 1000);
    });
  };


  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to={isProvider ? "/dashboard/provider" : "/dashboard/client"}>
            <Button variant="ghost" size="sm" className="pl-0 mb-4 text-gray-500">
                <ArrowLeft size={18} className="mr-1" /> Retour au tableau de bord
            </Button>
        </Link>
        
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-eveneo-dark mb-2">Paramètres du compte</h1>
                <p className="text-gray-500 mb-8">Gérez vos informations personnelles et votre profil public.</p>
            </div>
            {!isOnline && (
                <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    <WifiOff size={14} /> Mode Hors Ligne
                </div>
            )}
        </div>

        <form onSubmit={handleSave} className="space-y-8">

            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-lg font-extrabold text-gray-900">Informations personnelles</h2>
                    <p className="text-sm text-gray-500 mt-1">Identité, sécurité et informations publiques.</p>
                </div>
            </div>
            
            {/* Section 1: Identité */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <Lock size={20} className="text-gray-400" /> Informations d'identité
                </h2>
                
                {!canEditName && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-800 flex items-start gap-3">
                        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Modification restreinte.</span>
                            <p>Votre identité est en cours de vérification ou déjà validée. Pour changer votre nom, veuillez contacter le support.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Nom complet / Entreprise</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                readOnly={!canEditName} 
                                disabled={!canEditName}
                                className={`w-full bg-gray-50 border border-gray-200 text-sm rounded-xl block p-3 pl-10 ${canEditName ? 'focus:ring-2 focus:ring-eveneo-violet text-gray-900' : 'text-gray-500 cursor-not-allowed opacity-70'}`} 
                            />
                            <User size={18} className="absolute left-3 top-3 text-gray-400" />
                            {!canEditName && <Lock size={14} className="absolute right-3 top-3.5 text-gray-400" />}
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                        <div className="relative">
                             <input type="text" value={email} readOnly disabled className="w-full bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-xl block p-3 cursor-not-allowed pl-10" />
                            <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                            <Lock size={14} className="absolute right-3 top-3.5 text-gray-400" />
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Téléphone</label>
                         <div className="relative">
                             <input type="text" value={phone || 'Non renseigné'} readOnly disabled className="w-full bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-xl block p-3 cursor-not-allowed pl-10" />
                            <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                            <Lock size={14} className="absolute right-3 top-3.5 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Sécurité & Mot de passe */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <KeyRound size={20} className="text-eveneo-violet" /> Sécurité & Connexion
                </h2>
                
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-2">
                        {currentUser?.hasPassword ? "Modifier votre mot de passe" : "Créer un mot de passe"}
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                        {currentUser?.hasPassword 
                            ? "Vous utilisez déjà un mot de passe pour vous connecter." 
                            : "Vous utilisez une connexion sociale (Google/Facebook). Créez un mot de passe pour pouvoir vous connecter aussi avec votre email."}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Nouveau mot de passe" 
                            type="password" 
                            placeholder="Minimum 6 caractères"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-white"
                        />
                        <Input 
                            label="Confirmer le mot de passe" 
                            type="password" 
                            placeholder="Répétez le mot de passe"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Informations Publiques */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <MapPin size={20} className="text-eveneo-violet" /> Coordonnées & Bio
                </h2>
                <div className="space-y-6">
                    <Input label="Adresse Postale" icon={MapPin} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Rue de Paris..." className="bg-white" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                        <textarea className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-eveneo-violet/20 focus:outline-none block p-3 h-32" placeholder="Présentez votre activité..." value={bio} onChange={(e) => setBio(e.target.value)}></textarea>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {message && (
                <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 p-4 rounded-xl text-sm shadow-lg animate-in slide-in-from-bottom-5 z-50 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : message.type === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-600"></div>}
                    {message.text}
                </div>
            )}

            <div className="flex justify-end pt-4 sticky bottom-0 bg-gray-50/90 backdrop-blur py-4 border-t border-gray-200 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:border-0 z-10">
                <Button variant="primary" size="lg" type="submit" disabled={isLoading} className="shadow-xl">
                    <Save size={18} className="mr-2" /> {isLoading ? '...' : 'Enregistrer tout'}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};
