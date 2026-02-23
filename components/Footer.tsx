
import React from 'react';
import { Facebook, Instagram, Twitter, Mail, MapPin, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  return (
    <footer className="bg-eveneo-dark text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo height={32} />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-eveneo-blue transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-eveneo-pink transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-eveneo-blue transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.platform')}</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">{t('footer.links.how')}</Link></li>
              <li><Link to="/search" className="hover:text-white transition-colors">{t('footer.links.services')}</Link></li>
              {currentUser?.role !== 'client' && (
                <li><Link to="/pricing" className="hover:text-white transition-colors">{t('footer.links.pricing')}</Link></li>
              )}
              <li><Link to="/testimonials" className="hover:text-white transition-colors">{t('footer.links.testimonials')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.legal')}</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link to="/page/legal" className="hover:text-white transition-colors">{t('footer.links.legal')}</Link></li>
              <li><Link to="/page/terms" className="hover:text-white transition-colors">{t('footer.links.terms')}</Link></li>
              <li><Link to="/page/privacy" className="hover:text-white transition-colors">{t('footer.links.privacy')}</Link></li>
              <li><Link to="/page/community" className="hover:text-white transition-colors">Charte de la communauté</Link></li>
              <li><Link to="/page/help" className="hover:text-white transition-colors">{t('footer.links.help')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.contact')}</h3>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-eveneo-violet mt-0.5 shrink-0" />
                <span>1 Place Ville Marie,<br/>Montréal, QC H3B 2B6, Canada</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-eveneo-violet" />
                <span>contact@eveneo.ca</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© 2024 Événéo. {t('footer.rights')}.</p>
          <div className="flex gap-6 text-gray-500 text-sm items-center">
            <span>{t('footer.made_with')}</span>
            <Link to="/admin/dashboard" className="flex items-center gap-1 hover:text-gray-300 opacity-50 hover:opacity-100 transition-all">
                <Lock size={12} /> <span className="text-xs">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};