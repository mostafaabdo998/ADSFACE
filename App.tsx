
import React, { useState, useEffect, useCallback } from 'react';
import { NewsItem, SiteSettings } from './types';
import { NewsCard } from './components/NewsCard';
import { AdSlot } from './components/AdSlot';
import { ArticlePage } from './components/ArticlePage';
import { Dashboard } from './components/Dashboard';
import { adGuard } from './services/AdGuardService';

const LoginPage: React.FC<{ onLogin: (user: string, pass: string) => void, error: string, onBack: () => void }> = ({ onLogin, error, onBack }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-6 md:p-10 rounded-[30px] md:rounded-[40px] shadow-2xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4">🔒</div>
          <h2 className="text-xl font-black text-gray-900">دخول المسؤول</h2>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="اسم المستخدم" value={u} onChange={e => setU(e.target.value)} className="w-full bg-gray-50 border-none px-6 py-4 rounded-xl font-bold outline-none text-right" />
          <input type="password" placeholder="كلمة المرور" value={p} onChange={e => setP(e.target.value)} className="w-full bg-gray-50 border-none px-6 py-4 rounded-xl font-bold outline-none text-right" />
          {error && <p className="text-red-500 text-[10px] font-black text-center">{error}</p>}
          <button onClick={() => onLogin(u, p)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-colors">دخول النظام</button>
          <button onClick={onBack} className="w-full text-gray-400 text-[10px] font-black uppercase tracking-widest mt-4 hover:text-gray-600">العودة للموقع</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [path, setPath] = useState(window.location.pathname);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const navigate = useCallback((to: string) => {
    if (window.location.pathname === to) return;
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    loadData();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [s, a] = await Promise.all([
        adGuard.getSettings(),
        adGuard.getArticles()
      ]);
      setSettings(s);
      setArticles(a || []);
      if (s) adGuard.trackVisit().catch(() => {});
    } catch (e) {
      console.error("App Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (u: string, p: string) => {
    if (settings && u.trim() === settings.adminUsername?.trim() && p.trim() === settings.adminPassword?.trim()) {
      setIsLoggedIn(true);
      navigate('/dashboard');
    } else {
      setLoginError('بيانات الدخول غير صحيحة');
    }
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8 animate-pulse" dir="rtl">
        <div className="w-full h-64 md:h-[500px] bg-gray-100 rounded-3xl md:rounded-[40px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-3xl" />)}
        </div>
      </div>
    );

    if (!settings) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <h2 className="text-xl font-black text-gray-900">جاري الاتصال...</h2>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black">تحديث الصفحة</button>
      </div>
    );

    if (path === '/dashboard' || path === '/login') {
      return isLoggedIn ? <Dashboard onBack={() => navigate('/')} /> : <LoginPage onLogin={handleLogin} error={loginError} onBack={() => navigate('/')} />;
    }

    if (path.startsWith('/article/')) {
      const id = path.split('/')[2];
      const article = articles.find(a => a.id === id);
      if (article) return <ArticlePage key={article.id} item={article} onBack={() => navigate('/')} />;
      return (
        <div className="py-20 text-center px-4" dir="rtl">
          <h2 className="text-5xl font-black text-gray-200 mb-4">404</h2>
          <p className="font-bold text-gray-400 mb-8">عذراً، المحتوى غير متوفر حالياً</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg">الرئيسية</button>
        </div>
      );
    }

    return (
      <main className="max-w-6xl mx-auto px-4 mt-6 md:mt-12" dir="rtl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
            {articles.length > 0 && (
              <div className="relative group overflow-hidden rounded-3xl md:rounded-[40px] shadow-xl cursor-pointer" onClick={() => navigate(`/article/${articles[0].id}`)}>
                <img src={articles[0].image} className="w-full h-64 md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
                  <span className="bg-blue-600 text-white text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full w-fit mb-3 uppercase tracking-widest">{articles[0].category}</span>
                  <h2 className="text-xl md:text-4xl font-black text-white mb-3 leading-tight">{articles[0].title}</h2>
                  <p className="text-gray-300 text-xs md:text-sm opacity-80 leading-relaxed line-clamp-2 hidden md:block">{articles[0].excerpt}</p>
                </div>
              </div>
            )}
            
            <AdSlot adSlot={settings.adSlotMain} format="horizontal" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              {articles.slice(1).map(item => (
                <div key={item.id} onClick={() => navigate(`/article/${item.id}`)} className="cursor-pointer">
                  <NewsCard item={item} />
                </div>
              ))}
            </div>
          </div>
          
          <aside className="space-y-8 md:space-y-12">
            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-sm border border-gray-100">
              <h4 className="font-black border-r-4 border-blue-600 pr-4 mb-8 text-lg md:text-xl text-gray-900 text-right">الأكثر قراءة</h4>
              <ul className="space-y-6 md:space-y-8">
                {articles.slice(0, 5).map((art, i) => (
                  <li key={art.id} onClick={() => navigate(`/article/${art.id}`)} className="flex gap-4 md:gap-6 group cursor-pointer items-start justify-end">
                    <p className="text-xs md:text-sm font-bold group-hover:text-blue-600 line-clamp-2 leading-relaxed text-right transition-colors order-1">{art.title}</p>
                    <span className="text-2xl md:text-3xl font-black text-gray-100 group-hover:text-blue-200 transition-colors order-2">0{i+1}</span>
                  </li>
                ))}
              </ul>
            </div>
            <AdSlot adSlot={settings.adSlotSidebar} format="rectangle" />
          </aside>
        </div>
      </main>
    );
  };

  const isDashboardView = path === '/dashboard' || path === '/login';

  return (
    <div className="min-h-screen bg-[#fcfcfd]" dir="rtl">
      {!isDashboardView && (
        <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="bg-blue-600 text-white w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-lg group-hover:scale-105 transition-transform">{(settings?.siteName || 'أ').charAt(0)}</div>
              <h1 className="text-base md:text-xl font-black text-gray-900 uppercase tracking-tighter">{settings?.siteName || 'الجزيرة'}</h1>
            </div>
            
            <nav className="hidden lg:flex gap-8 text-[11px] font-black uppercase text-gray-400">
              <button onClick={() => navigate('/')} className={`transition-colors hover:text-blue-600 ${path === '/' ? 'text-blue-600' : ''}`}>الرئيسية</button>
              {settings?.categories?.slice(0, 4).map(cat => (
                <a key={cat} href="#" onClick={(e) => e.preventDefault()} className="hover:text-gray-900 transition-colors">{cat}</a>
              ))}
            </nav>

            <button onClick={() => isLoggedIn ? navigate('/dashboard') : navigate('/login')} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </button>
          </div>
        </header>
      )}

      <div className="pb-10 md:pb-20">
        {renderContent()}
      </div>

      {!isDashboardView && (
        <footer className="py-10 md:py-16 border-t border-gray-50 bg-white">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-gray-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} جميع الحقوق محفوظة لشبكة {settings?.siteName || 'الإخبارية'}</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
