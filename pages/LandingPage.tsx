
import React, { useState, useEffect } from 'react';
import { ArrowRight, Search, Calendar, CreditCard, Check, Star, ShieldCheck, Rocket } from 'lucide-react';
import { Button } from '../components/Button';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceProvider, Testimonial } from '../types';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { adsService } from '../services/adsService';
import { providerService } from '../services/providerService';
import { supabase } from '../services/supabaseClient';

const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Marie Dupont',
    role: 'Mariée (Juin 2024)',
    content: "Événéo m'a sauvé la vie ! J'ai trouvé mon traiteur et mon DJ en une soirée. Le paiement sécurisé rassure vraiment.",
    avatarUrl: 'https://picsum.photos/100/100?random=10'
  },
  {
    id: 't2',
    name: 'Thomas Leroy',
    role: 'Organisateur Corporate',
    content: "L'outil de gestion et la facturation centralisée sont parfaits pour les événements d'entreprise. Gain de temps énorme.",
    avatarUrl: 'https://picsum.photos/100/100?random=11'
  },
  {
    id: 't3',
    name: 'Sophie Martin',
    role: 'Anniversaire',
    content: "J'adore l'assistant intelligent Éva, elle m'a suggéré des idées d'animation auxquelles je n'aurais jamais pensé !",
    avatarUrl: 'https://picsum.photos/100/100?random=12'
  }
];

export const LandingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [displayProviders, setDisplayProviders] = useState<ServiceProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [providerReviewSnippets, setProviderReviewSnippets] = useState<Record<string, { rating: number; content: string }>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProviders(true);
      setProvidersError(null);
      try {
        // Fetch real providers from Supabase
        const providers = await providerService.getProviders();
        // Display top 4 as featured
        const topProviders = providers.slice(0, 4);
        setDisplayProviders(topProviders);

        const providerIds = topProviders.map(p => p.id);
        if (providerIds.length > 0) {
          const { data, error } = await supabase
            .from('reviews')
            .select('provider_id,rating,content,created_at')
            .in('provider_id', providerIds)
            .order('created_at', { ascending: false })
            .limit(50);

          if (!error && data) {
            const snippets: Record<string, { rating: number; content: string }> = {};
            for (const r of data as any[]) {
              if (!snippets[r.provider_id] && r.content) {
                snippets[r.provider_id] = { rating: Number(r.rating) || 0, content: String(r.content) };
              }
            }
            setProviderReviewSnippets(snippets);
          }
        }
      } catch (error) {
        console.error("Failed to fetch featured providers", error);
        setProvidersError("Impossible de charger les prestataires pour le moment.");
      } finally {
        setIsLoadingProviders(false);
      }
    };

    fetchData();

    const campaigns = adsService.getCampaigns().filter(c => c.status === 'active');
    setActiveCampaigns(campaigns);
  }, []);

  // Categories mapping for dynamic translation
  const categories = [
    { key: 'caterer', label: 'Traiteur' },
    { key: 'photographer', label: 'Photographe' },
    { key: 'dj', label: 'DJ' },
    { key: 'venue', label: 'Lieu' },
    { key: 'decoration', label: 'Décoration' },
    { key: 'animation', label: 'Animation' },
    { key: 'transport', label: 'Transport' },
    { key: 'equipment', label: 'Matériel' }
  ];

  return (
    <div className="bg-white overflow-x-hidden">

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-gradient-to-br from-eveneo-blue/20 to-eveneo-pink/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-gradient-to-tr from-eveneo-orange/10 to-eveneo-violet/10 rounded-full blur-3xl opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-eveneo-dark mb-6 leading-tight">
              {t('hero.title_start')} <br />
              <span className="text-transparent bg-clip-text bg-eveneo-gradient">{t('hero.title_highlight')}</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?role=client">
                <Button variant="primary" size="lg" className="w-full sm:w-auto group">
                  {t('hero.cta_client')}
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Link to="/register?role=provider">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t('hero.cta_provider')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Mockup Image */}
          <div className="relative mx-auto max-w-5xl mt-12 rounded-2xl p-2 bg-gradient-to-b from-gray-100 to-transparent">
            <img
              src="https://picsum.photos/1200/600?random=hero"
              alt="Platform Dashboard"
              className="rounded-xl shadow-2xl border border-gray-200 w-full h-auto object-cover"
            />
            {/* Floating Badges */}
            <div className="absolute -top-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-3 animate-bounce duration-[3000ms]">
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase">{t('hero.security_label')}</p>
                <p className="font-bold text-eveneo-dark">{t('hero.security_badge')}</p>
              </div>
            </div>
          </div>

          {/* Partners/Trust */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400 mb-6 uppercase tracking-widest font-semibold">{t('hero.trust_text')}</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['Vogue Events', 'TechCrunch Party', 'Wedding Planner Co', 'Corporate Elite', 'FestivAll'].map(logo => (
                <span key={logo} className="text-xl font-bold font-serif">{logo}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-eveneo-light" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-eveneo-dark mb-4">{t('how_it_works.title')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('how_it_works.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Search size={32} />,
                color: 'bg-eveneo-blue',
                title: t('how_it_works.step1_title'),
                desc: t('how_it_works.step1_desc')
              },
              {
                icon: <Calendar size={32} />,
                color: 'bg-eveneo-violet',
                title: t('how_it_works.step2_title'),
                desc: t('how_it_works.step2_desc')
              },
              {
                icon: <CreditCard size={32} />,
                color: 'bg-eveneo-pink',
                title: t('how_it_works.step3_title'),
                desc: t('how_it_works.step3_desc')
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center hover:-translate-y-2 transition-transform duration-300">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${step.color} text-white flex items-center justify-center mb-6 shadow-glow`}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-eveneo-dark mb-2">{t('categories.title')}</h2>
              <p className="text-gray-500">{t('categories.subtitle')}</p>
            </div>
            <Link to="/search" className="hidden md:block text-eveneo-violet font-semibold hover:underline">{t('categories.see_all')} →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <Link to={`/search?category=${cat.label}`} key={i} className="group cursor-pointer">
                <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
                  <img
                    src={`https://picsum.photos/400/300?random=${200 + i}`}
                    alt={cat.label}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 left-3 z-20 text-white font-bold text-lg">{t(`categories.${cat.key}`)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROVIDERS (Updated with Sponsorship Logic) */}
      <section className="py-20 bg-eveneo-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 justify-center mb-12">
            <Rocket size={24} className="text-purple-600 animate-bounce" />
            <h2 className="text-3xl font-bold text-eveneo-dark">Découvrir nos prestataires</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProviders.length > 0 ? displayProviders.map(provider => {
              const isSponsored = activeCampaigns.some(c => c.providerId === provider.id);
              const snippet = providerReviewSnippets[provider.id];
              return (
                <div key={provider.id} className="flex flex-col">
                  <ServiceCard provider={provider} isSponsored={isSponsored} className="h-full" />
                  <div className="mt-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    {snippet ? (
                      <div>
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                          <Star size={16} fill="currentColor" />
                          <span>{snippet.rating.toFixed(1)}</span>
                          <span className="text-gray-400 font-normal text-xs">Avis client</span>
                        </div>
                        <p className="text-sm text-gray-600 italic line-clamp-2">"{snippet.content}"</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Aucun avis client pour le moment.</p>
                    )}
                  </div>
                </div>
              );
            }) : isLoadingProviders ? (
              <div className="col-span-full text-center text-gray-500">Chargement des prestataires...</div>
            ) : (
              <div className="col-span-full text-center text-gray-500">
                {providersError || "Aucun prestataire disponible."}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 bg-white" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-eveneo-dark mb-4">{t('pricing.title')}</h2>
            <p className="text-gray-500">{t('pricing.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-eveneo-blue transition-colors">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('pricing.visitor')}</h3>
              <div className="text-4xl font-bold mb-6">{t('pricing.free')}</div>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.search')}</li>
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.payment')}</li>
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.support')}</li>
              </ul>
              <Link to="/register?role=client">
                <Button variant="outline" fullWidth className="text-eveneo-dark border-gray-200">{t('pricing.signup')}</Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-eveneo-dark text-white p-8 rounded-2xl shadow-xl relative transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-eveneo-gradient text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">{t('pricing.popular')}</div>
              <h3 className="text-xl font-bold mb-2">{t('pricing.provider_pro')}</h3>
              <div className="text-4xl font-bold mb-1">29€ <span className="text-lg font-normal text-gray-400">{t('pricing.month')}</span></div>
              <p className="text-gray-400 text-sm mb-6">Idéal pour les indépendants.</p>
              <ul className="space-y-3 text-gray-300 mb-8">
                <li className="flex gap-2"><Check size={18} className="text-eveneo-blue" /> {t('pricing.features.verified')}</li>
                <li className="flex gap-2"><Check size={18} className="text-eveneo-blue" /> {t('pricing.features.commission')}</li>
                <li className="flex gap-2"><Check size={18} className="text-eveneo-blue" /> {t('pricing.features.dashboard')}</li>
                <li className="flex gap-2"><Check size={18} className="text-eveneo-blue" /> {t('pricing.features.visibility')}</li>
              </ul>
              <Link to="/register?role=provider">
                <Button variant="primary" fullWidth>{t('pricing.try_free')}</Button>
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-eveneo-violet transition-colors">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('pricing.agency')}</h3>
              <div className="text-4xl font-bold mb-6">99€ <span className="text-lg font-normal text-gray-400">{t('pricing.month')}</span></div>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.multi')}</li>
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.api')}</li>
                <li className="flex gap-2"><Check size={18} className="text-green-500" /> {t('pricing.features.support24')}</li>
              </ul>
              <Link to="/contact-sales">
                <Button variant="outline" fullWidth className="text-eveneo-dark border-gray-200">{t('pricing.contact_sales')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-gradient-to-br from-eveneo-violet/5 to-eveneo-blue/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-eveneo-dark mb-12 text-center">{t('testimonials.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="bg-white p-8 rounded-2xl shadow-sm border border-white/50">
                <div className="flex gap-1 text-amber-400 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill="currentColor" />)}
                </div>
                <p className="text-gray-600 mb-6 italic">"{t.content}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.avatarUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-bold text-eveneo-dark">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (Short) */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('faq.title')}</h2>
          <div className="space-y-4">
            <details className="group bg-gray-50 rounded-2xl p-4 cursor-pointer">
              <summary className="font-semibold flex justify-between items-center list-none">
                {t('faq.q1')}
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-500 mt-3 text-sm">
                {t('faq.a1')}
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl p-4 cursor-pointer">
              <summary className="font-semibold flex justify-between items-center list-none">
                {t('faq.q2')}
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-500 mt-3 text-sm">
                {t('faq.a2')}
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl p-4 cursor-pointer">
              <summary className="font-semibold flex justify-between items-center list-none">
                {t('faq.q3')}
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-500 mt-3 text-sm">
                {t('faq.a3')}
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-eveneo-dark text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-6">{t('cta_final.title')}</h2>
          <p className="text-gray-400 mb-10 text-lg">{t('cta_final.subtitle')}</p>
          <Link to="/register?role=client">
            <Button variant="primary" size="lg" className="px-12 py-4 text-lg shadow-glow">
              {t('cta_final.button')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
