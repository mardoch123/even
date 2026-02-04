
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import { useLanguage } from '../contexts/LanguageContext';

export const PricingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-eveneo-dark mb-4">{t('pricing.title')}</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Basic */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-eveneo-blue transition-colors shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('pricing.visitor')}</h3>
            <div className="text-4xl font-bold mb-6">{t('pricing.free')}</div>
            <p className="text-gray-500 mb-6 text-sm">Pour les particuliers qui organisent un événement.</p>
            <ul className="space-y-4 text-gray-600 mb-8">
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.search')}</li>
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.payment')}</li>
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.support')}</li>
            </ul>
            <Link to="/register?role=client">
              <Button variant="outline" fullWidth className="text-eveneo-dark border-gray-200">{t('pricing.signup')}</Button>
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-eveneo-dark text-white p-8 rounded-2xl shadow-2xl relative transform md:-translate-y-4 border-2 border-eveneo-violet">
            <div className="absolute top-0 right-0 bg-eveneo-gradient text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">{t('pricing.popular')}</div>
            <h3 className="text-xl font-bold mb-2">{t('pricing.provider_pro')}</h3>
            <div className="text-4xl font-bold mb-1">29€ <span className="text-lg font-normal text-gray-400">{t('pricing.month')}</span></div>
            <p className="text-gray-400 text-sm mb-6">Idéal pour les indépendants et freelances.</p>
            <ul className="space-y-4 text-gray-300 mb-8">
              <li className="flex gap-3"><Check size={18} className="text-eveneo-blue shrink-0" /> {t('pricing.features.verified')}</li>
              <li className="flex gap-3"><Check size={18} className="text-eveneo-blue shrink-0" /> {t('pricing.features.commission')}</li>
              <li className="flex gap-3"><Check size={18} className="text-eveneo-blue shrink-0" /> {t('pricing.features.dashboard')}</li>
              <li className="flex gap-3"><Check size={18} className="text-eveneo-blue shrink-0" /> {t('pricing.features.visibility')}</li>
            </ul>
            <Link to="/register?role=provider">
              <Button variant="primary" fullWidth>{t('pricing.try_free')}</Button>
            </Link>
          </div>

          {/* Business */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-eveneo-violet transition-colors shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('pricing.agency')}</h3>
            <div className="text-4xl font-bold mb-6">99€ <span className="text-lg font-normal text-gray-400">{t('pricing.month')}</span></div>
            <p className="text-gray-500 mb-6 text-sm">Pour les agences et lieux de réception.</p>
            <ul className="space-y-4 text-gray-600 mb-8">
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.multi')}</li>
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.api')}</li>
              <li className="flex gap-3"><Check size={18} className="text-green-500 shrink-0" /> {t('pricing.features.support24')}</li>
            </ul>
            <Link to="/contact-sales">
                <Button variant="outline" fullWidth className="text-eveneo-dark border-gray-200">{t('pricing.contact_sales')}</Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-20 text-center">
            <h3 className="text-xl font-bold mb-4">Une question sur nos offres ?</h3>
            <Link to="/page/help" className="text-eveneo-violet font-semibold hover:underline">Visitez notre centre d'aide</Link>
        </div>
      </div>
    </div>
  );
};
