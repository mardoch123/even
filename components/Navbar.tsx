
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, LogOut, User as UserIcon, LayoutDashboard, Settings, Bell, MessageSquare, CreditCard, Globe, ChevronDown, Heart, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';
import { notificationService } from '../services/notificationService';

type LocalNotification = {
  id: string;
  title: string;
  content: string;
  url: string;
  createdAt: number;
  read?: boolean;
};

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  
  const { currentUser, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const msgMenuRef = useRef<HTMLDivElement>(null);

  // DISABLE NAVIGATION ON ONBOARDING PAGE
  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) setIsNotifOpen(false);
      if (msgMenuRef.current && !msgMenuRef.current.contains(event.target as Node)) setIsMsgOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const readLocalNotifications = (): LocalNotification[] => {
    try {
      const raw = localStorage.getItem('eveneo_notifications');
      const parsed = raw ? (JSON.parse(raw) as LocalNotification[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeLocalNotifications = (next: LocalNotification[]) => {
    try {
      localStorage.setItem('eveneo_notifications', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const loadNotifications = () => {
    const list = readLocalNotifications().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setNotifications(list);
  };

  const handleOpenMessages = () => {
    setIsMsgOpen(false);
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
    navigate('/messages');
  };

  const handleToggleNotifications = () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    setIsMsgOpen(false);
    if (next) loadNotifications();
  };

  const handleNotificationClick = (n: LocalNotification) => {
    const next = notifications.map(x => x.id === n.id ? { ...x, read: true } : x);
    setNotifications(next);
    writeLocalNotifications(next);
    setIsNotifOpen(false);
    if (n.url) navigate(n.url);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (currentUser?.role === UserRole.ADMIN) return '/admin/dashboard';
    return currentUser?.role === UserRole.PROVIDER ? '/dashboard/provider' : '/dashboard/client';
  };

  const navLinks = [
    { name: t('nav.explore'), path: '/search' },
    { name: t('nav.howItWorks'), path: '/how-it-works' },
    { name: t('nav.pricing'), path: '/pricing' },
  ];

  const isLanding = location.pathname === '/';
  
  const headerClasses = isLanding
    ? (isScrolled ? 'bg-white shadow-md text-eveneo-dark' : 'bg-gray-900/95 backdrop-blur-sm text-white')
    : 'bg-white shadow-md text-eveneo-dark';

  const textClasses = (isLanding && !isScrolled) ? 'text-white' : 'text-gray-600 hover:text-eveneo-violet';
  const iconColor = (isLanding && !isScrolled) ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-eveneo-violet';

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3 ${headerClasses}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Logo height={32} className="group-hover:scale-105 transition-transform" />
          </Link>

          {/* Desktop Nav - Disabled on Onboarding */}
          <nav className={`hidden md:flex items-center gap-6 ${isOnboarding ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors ${textClasses}`}
              >
                {link.name}
              </Link>
            ))}
            
            <div className="relative group ml-4 flex items-center gap-2">
                <div className="relative group/curr">
                    <button className={`flex items-center gap-1 text-xs font-bold border rounded px-2 py-1 ${isLanding && !isScrolled ? 'border-white/30 text-white' : 'border-gray-200 text-gray-600'}`}>
                        {currency} <ChevronDown size={12} />
                    </button>
                    <div className="absolute top-full right-0 mt-2 bg-white text-gray-800 shadow-lg rounded-lg py-1 w-20 hidden group-hover/curr:block border border-gray-100 z-50">
                        {['CAD', 'EUR', 'USD'].map(c => (
                            <button key={c} onClick={() => setCurrency(c as any)} className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-50 ${currency === c ? 'font-bold text-eveneo-violet' : ''}`}>{c}</button>
                        ))}
                    </div>
                </div>
                <div className="relative group/lang">
                    <button className={`flex items-center gap-1 text-xs font-bold border rounded px-2 py-1 ${isLanding && !isScrolled ? 'border-white/30 text-white' : 'border-gray-200 text-gray-600'}`}>
                        <Globe size={12} /> {language.toUpperCase()}
                    </button>
                    <div className="absolute top-full right-0 mt-2 bg-white text-gray-800 shadow-lg rounded-lg py-1 w-20 hidden group-hover/lang:block border border-gray-100 z-50">
                        <button onClick={() => setLanguage('fr')} className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-50 ${language === 'fr' ? 'font-bold text-eveneo-violet' : ''}`}>FR</button>
                        <button onClick={() => setLanguage('en')} className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-50 ${language === 'en' ? 'font-bold text-eveneo-violet' : ''}`}>EN</button>
                    </div>
                </div>
            </div>
          </nav>

          {/* Actions - Disabled on Onboarding */}
          <div className={`hidden md:flex items-center gap-4 ${isOnboarding ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <Link to="/search" className={`p-2 rounded-full transition-colors ${
              (isLanding && !isScrolled) ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-gray-600'
            }`}>
              <Search size={20} />
            </Link>
            
            {currentUser ? (
              <>
                <div className="relative" ref={msgMenuRef}>
                    <button onClick={handleOpenMessages} className={`p-2 rounded-full transition-colors relative ${iconColor}`}>
                        <MessageSquare size={20} />
                    </button>
                </div>
                <div className="relative" ref={notifMenuRef}>
                    <button onClick={handleToggleNotifications} className={`p-2 rounded-full transition-colors relative mr-2 ${iconColor}`}>
                        <Bell size={20} />
                    </button>

                    {isNotifOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in slide-in-from-top-2 text-gray-800 z-50">
                        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                          <p className="font-extrabold">Notifications</p>
                          <button
                            onClick={async () => {
                              await notificationService.requestPermission();
                              loadNotifications();
                            }}
                            className="text-xs font-bold text-eveneo-violet hover:underline"
                            type="button"
                          >
                            Activer
                          </button>
                        </div>

                        <div className="max-h-96 overflow-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500">
                              Aucune notification pour le moment.
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${n.read ? 'opacity-70' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-sm text-gray-900">{n.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{n.content}</p>
                                    <p className="text-[10px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                                  </div>
                                  {!n.read && <div className="w-2 h-2 rounded-full bg-eveneo-violet mt-1 shrink-0" />}
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        {notifications.length > 0 && (
                          <div className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                const next = notifications.map(x => ({ ...x, read: true }));
                                setNotifications(next);
                                writeLocalNotifications(next);
                              }}
                              className="w-full text-xs font-bold text-gray-600 hover:text-gray-900"
                            >
                              Tout marquer comme lu
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                <div className="relative" ref={userMenuRef}>
                   <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 focus:outline-none group">
                     <div className={`w-9 h-9 rounded-full flex items-center justify-center border overflow-hidden transition-all ${
                       (isLanding && !isScrolled) ? 'border-white/50 ring-offset-transparent' : 'border-gray-300 ring-offset-white'
                     } group-hover:ring-2 group-hover:ring-eveneo-violet`}>
                       {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover" /> : <div className="bg-gray-200 w-full h-full flex items-center justify-center text-gray-500">{(currentUser.name || 'U').charAt(0)}</div>}
                     </div>
                   </button>
                   {isUserMenuOpen && (
                     <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in slide-in-from-top-2 text-gray-800">
                       <div className="px-4 py-2 border-b border-gray-50 mb-2">
                         <p className="font-bold truncate">{currentUser.name}</p>
                       </div>
                       <Link to={getDashboardLink()} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:text-eveneo-violet" onClick={() => setIsUserMenuOpen(false)}>
                         <LayoutDashboard size={16} /> {t('nav.dashboard')}
                       </Link>
                       {currentUser.role === UserRole.PROVIDER && (
                          <Link to="/portfolio" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:text-eveneo-violet" onClick={() => setIsUserMenuOpen(false)}>
                            <ImageIcon size={16} /> Portfolio
                          </Link>
                       )}
                       {currentUser.role !== UserRole.ADMIN && (
                          <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:text-eveneo-violet" onClick={() => setIsUserMenuOpen(false)}>
                            <CreditCard size={16} /> {t('nav.wallet')}
                          </Link>
                       )}
                       <Link to="/favorites" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:text-eveneo-violet" onClick={() => setIsUserMenuOpen(false)}>
                         <Heart size={16} /> Mes Favoris
                       </Link>
                       <Link to="/settings" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:text-eveneo-violet" onClick={() => setIsUserMenuOpen(false)}>
                         <Settings size={16} /> {t('nav.settings')}
                       </Link>
                       <div className="border-t border-gray-50 mt-2 pt-2">
                         <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50">
                           <LogOut size={16} /> {t('nav.logout')}
                         </button>
                       </div>
                     </div>
                   )}
                </div>
              </>
            ) : (
              <>
                <Link to="/search">
                  <Button variant={(isLanding && !isScrolled) ? "outline" : "secondary"} size="sm" className={(isLanding && !isScrolled) ? "text-white border-white hover:bg-white hover:text-eveneo-dark" : ""}>
                    Trouver un prestataire
                  </Button>
                </Link>
                <Link to="/register?role=provider">
                  <Button variant="primary" size="sm" className="whitespace-nowrap">{t('nav.provider_cta')}</Button>
                </Link>
              </>
            )}
          </div>

          <button className={`md:hidden p-2 ${(isLanding && !isScrolled) ? 'text-white' : 'text-eveneo-dark'}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100 p-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link key={link.name} to={link.path} className="text-gray-800 font-medium py-2 border-b border-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-2">
            {currentUser ? (
              <Button variant="secondary" fullWidth onClick={handleLogout}>{t('nav.logout')}</Button>
            ) : (
              <>
                <Link to="/search" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="secondary" fullWidth>Trouver un prestataire</Button>
                </Link>
                <Link to="/register?role=provider" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" fullWidth>{t('nav.provider_cta')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
