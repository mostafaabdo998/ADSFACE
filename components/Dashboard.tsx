
import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings, NewsItem, ShieldStats, AdPlacement } from '../types';
import { adGuard } from '../services/AdGuardService';

export const Dashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'articles' | 'ads' | 'shield' | 'general'>('analytics');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<ShieldStats | null>(null);
  const [editingArticle, setEditingArticle] = useState<Partial<NewsItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [s, a, st] = await Promise.all([
        adGuard.getSettings(),
        adGuard.getArticles(),
        adGuard.getStats()
      ]);
      setSettings(s);
      setArticles(a || []);
      setStats(st || {
        totalProtectedVisits: 0,
        blockedBots: 0,
        fbVisits: 0,
        safeClicksGenerated: 0,
        revenueProtected: 0
      });
    } catch (e) {
      console.error('Dashboard Load Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (updatedSettings?: SiteSettings) => {
    const toSave = updatedSettings || settings;
    if (toSave) {
      try {
        await adGuard.saveSettings(toSave);
        setSettings({ ...toSave });
        alert('تم تحديث البيانات بنجاح');
      } catch (e) {
        alert('فشل حفظ الإعدادات');
      }
    }
  };

  const handleAddCategory = () => {
    if (newCategory && settings) {
      const cats = settings.categories || [];
      if (!cats.includes(newCategory)) {
        const updated = { ...settings, categories: [...cats, newCategory] };
        setSettings(updated);
        handleSaveSettings(updated);
        setNewCategory('');
      }
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (settings) {
      const updated = { ...settings, categories: (settings.categories || []).filter(c => c !== cat) };
      setSettings(updated);
      handleSaveSettings(updated);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingArticle(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = async () => {
    if (!editingArticle?.title || !editingArticle?.category || !settings) {
      alert('البيانات ناقصة (العنوان والقسم مطلوبان)');
      return;
    }
    try {
      const finalArticle: NewsItem = {
        id: editingArticle.id || Math.random().toString(36).substr(2, 9),
        title: editingArticle.title,
        excerpt: editingArticle.excerpt || (editingArticle.content?.substring(0, 150).replace(/<[^>]*>/g, '') + '...'),
        content: editingArticle.content || '',
        category: editingArticle.category,
        image: editingArticle.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
        videoEmbed: editingArticle.videoEmbed || '',
        date: editingArticle.date || new Date().toLocaleDateString('ar-EG')
      };
      await adGuard.saveArticle(finalArticle);
      setEditingArticle(null);
      loadAllData();
      alert('تم حفظ المقال');
    } catch (e) {
      alert('فشل حفظ المقال');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm('حذف نهائي للمقال؟')) {
      try {
        await adGuard.deleteArticle(id);
        loadAllData();
      } catch (e) {
        alert('فشل الحذف');
      }
    }
  };

  const updatePlacement = (index: number, field: keyof AdPlacement, value: any) => {
    if (!settings) return;
    const currentPlacements = settings.customAdPlacements || [];
    const newPlacements = [...currentPlacements];
    if (newPlacements[index]) {
      newPlacements[index] = { ...newPlacements[index], [field]: value };
      setSettings({ ...settings, customAdPlacements: newPlacements });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4" dir="rtl">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-400 text-sm">جاري التحميل...</p>
      </div>
    );
  }

  if (!settings) return <div className="p-20 text-center font-black">خطأ في الاتصال.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen animate-in fade-in duration-500" dir="rtl">
      <div className="flex justify-between items-center mb-10">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900">لوحة تحكم AdGuard</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase mt-1">نسخة الحماية الاحترافية • {settings.siteName}</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-gray-100 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-600 transition-colors">خروج</button>
           <button onClick={onBack} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all">العودة للموقع</button>
        </div>
      </div>

      <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-hide text-right" dir="rtl">
        {[
          { id: 'analytics', label: 'الرئيسية', icon: '📊' },
          { id: 'general', label: 'الإعدادات', icon: '⚙️' },
          { id: 'shield', label: 'الحماية الذكية', icon: '🛡️' },
          { id: 'ads', label: 'الإعلانات', icon: '💰' },
          { id: 'articles', label: 'المقالات', icon: '✍️' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500 text-right">
           <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4">👥</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي الزيارات</p>
              <p className="text-3xl font-black mt-1 text-gray-900">{(stats.totalProtectedVisits || 0).toLocaleString()}</p>
           </div>
           <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4">📱</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">زيارات فيسبوك</p>
              <p className="text-3xl font-black mt-1 text-indigo-600">{(stats.fbVisits || 0).toLocaleString()}</p>
           </div>
           <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="bg-red-50 text-red-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4">🤖</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">البوتات المحظورة</p>
              <p className="text-3xl font-black mt-1 text-red-600">{(stats.blockedBots || 0).toLocaleString()}</p>
           </div>
           <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="bg-green-50 text-green-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4">💵</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">العوائد المؤمنة</p>
              <p className="text-3xl font-black mt-1 text-green-600">{(stats.revenueProtected || 0).toLocaleString()}$</p>
           </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="space-y-8 max-w-4xl animate-in slide-in-from-bottom-4 duration-500 text-right">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-6 border-r-4 border-blue-600 pr-4">هوية الموقع وأمان المسؤول</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">اسم الموقع</label>
                <input type="text" value={settings.siteName || ''} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-blue-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">اسم المستخدم</label>
                <input type="text" value={settings.adminUsername || ''} onChange={e => setSettings({...settings, adminUsername: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-blue-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">كلمة المرور</label>
                <input type="password" value={settings.adminPassword || ''} onChange={e => setSettings({...settings, adminPassword: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-blue-100 text-right" />
              </div>
            </div>
            <button onClick={() => handleSaveSettings()} className="mt-8 bg-blue-600 text-white px-10 py-3.5 rounded-xl font-black text-xs shadow-lg shadow-blue-100">حفظ الإعدادات العامة</button>
          </div>

          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-6 border-r-4 border-green-600 pr-4">إدارة الأقسام</h3>
            <div className="flex gap-3 mb-8">
              <input type="text" placeholder="اسم القسم الجديد..." value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 bg-gray-50 p-4 rounded-xl font-bold outline-none text-right" />
              <button onClick={handleAddCategory} className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-black text-xs">إضافة القسم</button>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {(settings.categories || []).map(cat => (
                <div key={cat} className="bg-gray-50 px-5 py-3 rounded-xl flex items-center gap-4 font-bold text-sm border border-gray-100 group">
                   <button onClick={() => handleDeleteCategory(cat)} className="text-gray-300 group-hover:text-red-500 font-black transition-colors">×</button>
                   {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shield' && (
        <div className="space-y-8 max-w-4xl animate-in slide-in-from-bottom-4 duration-500 text-right">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-8 border-r-4 border-red-600 pr-4">خوارزمية الحماية (Anti-Limit Logic)</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">مدة البقاء - فيسبوك (ثانية)</label>
                <input type="number" value={settings.fbStayDuration || 0} onChange={e => setSettings({...settings, fbStayDuration: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 px-6 py-4 rounded-2xl outline-none font-bold border border-transparent focus:border-red-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">مدة البقاء - مصادر أخرى (ثانية)</label>
                <input type="number" value={settings.otherStayDuration || 0} onChange={e => setSettings({...settings, otherStayDuration: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 px-6 py-4 rounded-2xl outline-none font-bold border border-transparent focus:border-red-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">الحد الأدنى للتمرير (Scroll %)</label>
                <input type="number" value={settings.minScrollDepth || 0} onChange={e => setSettings({...settings, minScrollDepth: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 px-6 py-4 rounded-2xl outline-none font-bold border border-transparent focus:border-red-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">حد الترافيك (Shunting %)</label>
                <input type="number" value={settings.trafficShuntingLimit || 0} onChange={e => setSettings({...settings, trafficShuntingLimit: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 px-6 py-4 rounded-2xl outline-none font-bold border border-transparent focus:border-red-100 text-right" />
              </div>
            </div>
            <button onClick={() => handleSaveSettings()} className="mt-8 bg-red-600 text-white px-10 py-3.5 rounded-xl font-black text-xs shadow-lg shadow-red-100">تحديث نظام الحماية</button>
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="space-y-8 max-w-5xl animate-in slide-in-from-bottom-4 duration-500 text-right">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-8 border-r-4 border-yellow-500 pr-4">إعدادات Google AdSense</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Ad Client (ca-pub-xxx)</label>
                <input type="text" value={settings.adClient || ''} onChange={e => setSettings({...settings, adClient: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-mono text-sm font-bold border border-transparent focus:border-yellow-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Slot ID - المقال</label>
                <input type="text" value={settings.adSlotMain || ''} onChange={e => setSettings({...settings, adSlotMain: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-mono text-sm font-bold border border-transparent focus:border-yellow-100 text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase">Slot ID - الجانبي</label>
                <input type="text" value={settings.adSlotSidebar || ''} onChange={e => setSettings({...settings, adSlotSidebar: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-mono text-sm font-bold border border-transparent focus:border-yellow-100 text-right" />
              </div>
            </div>

            <h4 className="text-lg font-black mb-6 text-gray-800">وحدات إعلانية مخصصة (Custom Slots)</h4>
            <div className="grid gap-6">
               {(settings.customAdPlacements || []).map((pos, idx) => (
                 <div key={pos.id} className="p-6 border border-gray-100 rounded-3xl bg-gray-50/30">
                    <div className="flex justify-between items-center mb-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={pos.isActive} onChange={e => updatePlacement(idx, 'isActive', e.target.checked)} className="w-5 h-5 accent-blue-600" />
                          <span className="text-[9px] font-black text-gray-400 uppercase">نشط</span>
                       </label>
                       <span className="text-[10px] font-black bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-50">{pos.name}</span>
                    </div>
                    <textarea 
                      value={pos.code || ''} 
                      onChange={e => updatePlacement(idx, 'code', e.target.value)} 
                      placeholder="ضع كود الإعلان البرمجي هنا (HTML/JS)..."
                      rows={3}
                      className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 font-mono text-[11px] outline-none text-left"
                      dir="ltr"
                    />
                 </div>
               ))}
            </div>
            <button onClick={() => handleSaveSettings()} className="mt-8 bg-blue-600 text-white px-10 py-3.5 rounded-xl font-black text-xs shadow-lg shadow-blue-100">حفظ توزيع الإعلانات</button>
          </div>
        </div>
      )}

      {activeTab === 'articles' && (
        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500 text-right">
           {!editingArticle ? (
             <>
               <div className="flex justify-between items-center mb-10">
                 <button onClick={() => setEditingArticle({})} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-xl shadow-blue-100 hover:scale-105 transition-all">+ إنشاء مقال جديد</button>
                 <h3 className="text-xl font-black border-r-4 border-indigo-600 pr-4">إدارة المقالات ({articles.length})</h3>
               </div>
               <div className="grid gap-3">
                 {articles.length > 0 ? articles.map(art => (
                   <div key={art.id} className="p-5 border border-gray-50 rounded-2xl flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div className="flex gap-2">
                        <button onClick={() => setEditingArticle(art)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                        <button onClick={() => handleDeleteArticle(art.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <h5 className="font-black text-sm text-gray-900 mb-1">{art.title}</h5>
                          <div className="flex gap-3 items-center justify-end">
                             <span className="text-[9px] text-gray-300 font-bold">{art.date}</span>
                             <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{art.category}</span>
                          </div>
                        </div>
                        <img src={art.image} className="w-14 h-14 rounded-xl object-cover border border-gray-100 shadow-sm" alt="" />
                      </div>
                   </div>
                 )) : (
                   <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[32px] text-gray-300 font-bold">لا يوجد محتوى حالياً</div>
                 )}
               </div>
             </>
           ) : (
             <div className="space-y-8">
                <div className="flex justify-between items-center">
                   <button onClick={() => setEditingArticle(null)} className="text-gray-400 font-black text-xs hover:text-red-500">إلغاء التعديل</button>
                   <h3 className="text-xl font-black">محرر المقال الذكي</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black uppercase text-gray-400">عنوان الخبر</label>
                      <input type="text" value={editingArticle.title || ''} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold border border-transparent focus:border-indigo-100 outline-none text-right" />
                   </div>
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black uppercase text-gray-400">القسم</label>
                      <select value={editingArticle.category || ''} onChange={e => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold border border-transparent focus:border-indigo-100 outline-none text-right">
                         <option value="">اختر القسم المناسب...</option>
                         {(settings.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black uppercase text-gray-400">صورة الغلاف</label>
                      <div className="flex gap-4 items-center justify-end">
                         {editingArticle.image && <img src={editingArticle.image} className="w-16 h-12 rounded-lg object-cover border-2 border-white shadow-sm" />}
                         <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white border border-dashed border-gray-200 py-3 rounded-xl text-[10px] font-black text-gray-400 hover:border-indigo-200">اختر صورة</button>
                         <input type="file" hidden ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
                      </div>
                   </div>
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black uppercase text-gray-400">كود تضمين الفيديو</label>
                      <input type="text" placeholder="<iframe>...</iframe>" value={editingArticle.videoEmbed || ''} onChange={e => setEditingArticle({...editingArticle, videoEmbed: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-mono text-xs text-left" dir="ltr" />
                   </div>
                   <div className="md:col-span-2 space-y-2 text-right">
                      <label className="text-[10px] font-black uppercase text-gray-400">محتوى المقال الكامل (يدعم HTML)</label>
                      <textarea rows={12} value={editingArticle.content || ''} onChange={e => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-gray-50 p-8 rounded-[32px] font-serif leading-relaxed text-lg outline-none text-right" placeholder="ابدأ الكتابة هنا..." />
                   </div>
                </div>
                <button onClick={handleSaveArticle} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-100 hover:scale-[1.01] transition-transform">نشر المقال فوراً</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
