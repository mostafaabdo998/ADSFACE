
import React, { useState, useEffect } from 'react';
import { NewsItem, SiteSettings } from './types';
import { adGuard } from './services/AdGuardService';
import { NewsCard } from './components/NewsCard';
import { ArticlePage } from './components/ArticlePage';
import { Dashboard } from './components/Dashboard';
import { AdSlot } from './components/AdSlot';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'article' | 'dashboard'>('home');
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
    adGuard.trackVisit();
  }, []);

  const initApp = async () => {
    setLoading(true);
    const [arts, s] = await Promise.all([adGuard.getArticles(), adGuard.getSettings()]);
    setArticles(arts);
    setSettings(s);
    setLoading(false);
  };

  const openArticle = (item: NewsItem) => {
    setSelectedArticle(item);
    setView('article');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl md:text-2xl font-black shadow-lg shadow-blue-200">
              N
            </div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
              {settings?.siteName || 'أخباري'}
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {settings?.categories?.map(cat => (
              <button key={cat} className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 transition-colors tracking-widest">
                {cat}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setView('dashboard')}
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {view === 'home' && (
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
            {/* Top Ad */}
            <AdSlot placementId="pos_top" />

            {/* Featured Post / Hero Section */}
            <div className="mb-12 md:mb-16">
               <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2">
                 <span className="w-8 h-[2px] bg-blue-600"></span> آخر الأخبار
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                 {articles.map(art => (
                   <div key={art.id} onClick={() => openArticle(art)} className="cursor-pointer">
                     <NewsCard item={art} />
                   </div>
                 ))}
               </div>
            </div>

            <AdSlot placementId="pos_bottom" />
          </div>
        )}

        {view === 'article' && selectedArticle && (
          <ArticlePage item={selectedArticle} onBack={() => setView('home')} />
        )}

        {view === 'dashboard' && (
          <Dashboard onBack={() => setView('home')} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black">
              N
            </div>
            <h2 className="text-2xl font-black text-gray-900">{settings?.siteName}</h2>
          </div>
          <p className="max-w-md mx-auto text-gray-400 text-xs md:text-sm font-medium leading-relaxed mb-10">
            شبكة إخبارية مستقلة تقدم لكم آخر الأخبار والتحليلات بمصداقية وشفافية على مدار الساعة.
          </p>
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
            &copy; {new Date().getFullYear()} {settings?.siteName} - All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
