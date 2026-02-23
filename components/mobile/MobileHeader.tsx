import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../contexts/AuthContext';

interface MobileHeaderProps {
  showNotification?: boolean;
  onNotificationClick?: () => void;
  unreadCount?: number;
  showProfileLink?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  showNotification = true,
  onNotificationClick,
  unreadCount = 0,
  showProfileLink = true
}) => {
  const { currentUser } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-40 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar utilisateur - cliquable vers profil */}
        {showProfileLink ? (
          <Link to="/profile" className="flex items-center active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 hover:border-eveneo-violet/30 transition-colors">
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white font-bold text-sm">
                  {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
        ) : (
          <div className="w-10" />
        )}

        {/* Logo */}
        <Link to="/dashboard/client" className="flex items-center">
          <Logo height={32} />
        </Link>

        {/* Notification */}
        {showNotification ? (
          <button 
            onClick={onNotificationClick}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Bell size={24} className="text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
};
