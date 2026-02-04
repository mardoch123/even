
import React from 'react';
import { Search, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { useLanguage } from '../contexts/LanguageContext';

export const HowItWorksPage: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    { 
      icon: <Search size={32} />, 
      color: 'bg-eveneo-blue', 
      title: t('how_it_works.step1_title'), 
      desc: t('how_it_works.step1_desc'),
      details: "Utilisez nos filtres avancés pour trouver le prestataire idéal selon votre budget, lieu et style. Consultez les avis vérifiés et les portfolios."
    },
    { 
      icon: <Calendar size={32} />, 
      color: 'bg-eveneo-violet', 
      title: t('how_it_works.step2_title'), 
      desc: t('how_it_works.step2_desc'),
      details: "Discutez directement via notre messagerie sécurisée. Une fois d'accord, réservez le créneau. Le prestataire confirme sous 24h."
    },
    { 
      icon: <CreditCard size={32} />, 
      color: 'bg-eveneo-pink', 
      title: t('how_it_works.step3_title'), 
      desc: t('how_it_works.step3_desc'),
      details: "Vos fonds sont bloqués sur un compte séquestre. Le prestataire n'est payé que lorsque vous validez que la mission a été réalisée avec succès."
    }
  ];

  return (
    <div className="bg-eveneo-light min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-eveneo-dark mb-4">{t('how_it_works.title')}</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('how_it_works.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gray-200 -z-10"></div>

          {steps.map((step, idx) => (
            <div key={idx} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center relative">
              <div className={`w-24 h-24 mx-auto rounded-2xl ${step.color} text-white flex items-center justify-center mb-8 shadow-glow transform -translate-y-12`}>
                {step.icon}
              </div>
              <div className="-mt-4">
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-medium mb-4">{step.desc}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.details}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-white rounded-3xl p-12 shadow-xl text-center max-w-4xl mx-auto border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Prêt à commencer ?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search">
                <Button variant="primary" size="lg" className="group">
                  Trouver des prestataires
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Link to="/register?role=provider">
                <Button variant="secondary" size="lg">
                  Vendre mes services
                </Button>
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
};
