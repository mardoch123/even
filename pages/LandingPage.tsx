
import React, { useState, useEffect } from 'react';
import { ArrowRight, Search, Calendar, CreditCard, Star, ShieldCheck, Rocket } from 'lucide-react';
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

      {/* HERO SECTION - Modern & Fun */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-eveneo-blue/5 via-eveneo-violet/5 to-eveneo-pink/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-eveneo-blue/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-eveneo-pink/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-eveneo-violet/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-6 border border-gray-100">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">Plus de 10 000 événements organisés</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-eveneo-dark mb-6 leading-[1.1]">
                {t('hero.title_start')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-eveneo-blue via-eveneo-violet to-eveneo-pink animate-gradient">
                  {t('hero.title_highlight')}
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register?role=client">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto group shadow-xl shadow-eveneo-violet/30 hover:shadow-eveneo-violet/50 transition-shadow">
                    {t('hero.cta_client')}
                    <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" size={20} />
                  </Button>
                </Link>
                <Link to="/register?role=provider">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto border-2 hover:bg-gray-50 transition-colors">
                    {t('hero.cta_provider')}
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <img key={i} src={`https://picsum.photos/40/40?random=${i+50}`} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">4.9/5</span> sur +2k avis
                </div>
              </div>
            </div>

            {/* Right Content - Interactive Visual */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-eveneo-violet/20 transform hover:scale-[1.02] transition-transform duration-500">
                <img
                  src="https://picsum.photos/800/600?random=hero"
                  alt="Platform Dashboard"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce duration-[2000ms]">
                <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-xl text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase">{t('hero.security_label')}</p>
                  <p className="font-bold text-eveneo-dark">{t('hero.security_badge')}</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce duration-[2500ms] delay-500">
                <div className="bg-gradient-to-br from-eveneo-blue to-eveneo-violet p-3 rounded-xl text-white">
                  <Star size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase">Note moyenne</p>
                  <p className="font-bold text-eveneo-dark">4.8/5 ⭐</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400">
          <span className="text-sm">Découvrir</span>
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Modern Cards */}
      <section className="py-24 bg-gray-50" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-eveneo-violet/10 text-eveneo-violet px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              Comment ça marche
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-eveneo-dark mb-4">{t('how_it_works.title')}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('how_it_works.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-eveneo-blue via-eveneo-violet to-eveneo-pink" />
            
            {[
              {
                icon: <Search size={32} />,
                color: 'from-eveneo-blue to-blue-600',
                number: '01',
                title: t('how_it_works.step1_title'),
                desc: t('how_it_works.step1_desc')
              },
              {
                icon: <Calendar size={32} />,
                color: 'from-eveneo-violet to-violet-600',
                number: '02',
                title: t('how_it_works.step2_title'),
                desc: t('how_it_works.step2_desc')
              },
              {
                icon: <CreditCard size={32} />,
                color: 'from-eveneo-pink to-pink-600',
                number: '03',
                title: t('how_it_works.step3_title'),
                desc: t('how_it_works.step3_desc')
              }
            ].map((step, idx) => (
              <div key={idx} className="group relative">
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 relative z-10">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {step.number}
                  </div>
                  <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES - Modern Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div>
              <span className="inline-block bg-eveneo-pink/10 text-eveneo-pink px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                Explorez
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-eveneo-dark mb-2">{t('categories.title')}</h2>
              <p className="text-gray-500 text-lg">{t('categories.subtitle')}</p>
            </div>
            <Link to="/search" className="group flex items-center gap-2 text-eveneo-violet font-semibold hover:gap-3 transition-all">
              {t('categories.see_all')} 
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <Link to={`/search?category=${cat.label}`} key={i} className="group cursor-pointer">
                <div className="aspect-square rounded-3xl overflow-hidden relative shadow-lg hover:shadow-2xl transition-shadow duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                  <img
                    src={`https://picsum.photos/400/400?random=${200 + i}`}
                    alt={cat.label}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <h3 className="text-white font-bold text-xl mb-1">{t(`categories.${cat.key}`)}</h3>
                    <p className="text-white/70 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Découvrir →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROVIDERS - Modern Cards */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-purple-100 text-purple-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Rocket size={16} className="inline mr-2" />
              Prestataires populaires
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-eveneo-dark mb-4">Découvrir nos prestataires</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Les meilleurs professionnels sélectionnés pour faire de votre événement un moment inoubliable
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProviders.length > 0 ? displayProviders.map((provider, idx) => {
              const isSponsored = activeCampaigns.some(c => c.providerId === provider.id);
              const snippet = providerReviewSnippets[provider.id];
              return (
                <div key={provider.id} className="group flex flex-col" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:-translate-y-2">
                    <ServiceCard provider={provider} isSponsored={isSponsored} className="h-full" />
                    <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                      {snippet ? (
                        <div>
                          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                            <Star size={16} fill="currentColor" />
                            <span>{snippet.rating.toFixed(1)}</span>
                            <span className="text-gray-400 font-normal text-xs">· Avis vérifié</span>
                          </div>
                          <p className="text-sm text-gray-600 italic line-clamp-2">"{snippet.content}"</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Aucun avis client pour le moment.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : isLoadingProviders ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-eveneo-violet border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">{providersError || "Aucun prestataire disponible."}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS - Modern Cards */}
      <section className="py-24 bg-gradient-to-br from-eveneo-violet/5 via-eveneo-blue/5 to-eveneo-pink/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-amber-100 text-amber-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Star size={16} className="inline mr-2" fill="currentColor" />
              Témoignages
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-eveneo-dark mb-4">{t('testimonials.title')}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Découvrez ce que nos utilisateurs disent de leur expérience avec Événéo
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div key={t.id} className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 hover:-translate-y-2 transition-all duration-500">
                <div className="flex gap-1 text-amber-400 mb-6">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} fill="currentColor" />)}
                </div>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.avatarUrl} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                  <div>
                    <div className="font-bold text-eveneo-dark text-lg">{t.name}</div>
                    <div className="text-sm text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ - Modern Accordion */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block bg-eveneo-blue/10 text-eveneo-blue px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              FAQ
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-eveneo-dark mb-4">{t('faq.title')}</h2>
            <p className="text-gray-500 text-lg">Tout ce que vous devez savoir pour commencer</p>
          </div>
          
          <div className="space-y-4">
            {[
              { q: t('faq.q1'), a: t('faq.a1') },
              { q: t('faq.q2'), a: t('faq.a2') },
              { q: t('faq.q3'), a: t('faq.a3') }
            ].map((faq, idx) => (
              <details key={idx} className="group bg-gray-50 rounded-2xl p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <summary className="font-bold text-lg flex justify-between items-center list-none text-eveneo-dark">
                  {faq.q}
                  <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="text-gray-600 mt-4 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL - Modern Gradient */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-eveneo-dark via-gray-900 to-eveneo-dark" />
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-64 h-64 bg-eveneo-violet/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-eveneo-pink/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">{t('cta_final.title')}</h2>
          <p className="text-gray-400 mb-10 text-xl max-w-2xl mx-auto">{t('cta_final.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=client">
              <Button variant="primary" size="lg" className="px-12 py-4 text-lg shadow-2xl shadow-eveneo-violet/40 hover:shadow-eveneo-violet/60 transition-shadow">
                {t('cta_final.button')}
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-white/20 text-white hover:bg-white/10">
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
