
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [s, a, st] = await Promise.all([adGuard.getSettings(), adGuard.getArticles(), adGuard.getStats()]);
      
      const defaultPlacements: AdPlacement[] = [
        { id: 'pos_top', name: 'إعلان الهيدر (أعلى الصفحة)', code: '', isActive: true },
        { id: 'pos_after_title', name: 'إعلان تحت العنوان', code: '', isActive: true },
        { id: 'pos_mid_1', name: 'إعلان وسط المقال (1)', code: '', isActive: true },
        { id: 'pos_mid_2', name: 'إعلان وسط المقال (2)', code: '', isActive: true },
        { id: 'pos_bottom', name: 'إعلان أسفل المقال', code: '', isActive: true },
        { id: 'pos_sidebar_main', name: 'إعلان الشريط الجانبي', code: '', isActive: true }
      ];

      if (s) {
        if (!s.customAdPlacements || s.customAdPlacements.length === 0) {
          s.customAdPlacements = defaultPlacements;
        } else {
          // دمج المواضع المفقودة
          defaultPlacements.forEach(dp => {
            if (!s.customAdPlacements.find(p => p.id === dp.id)) {
              s.customAdPlacements.push(dp);
            }
          });
        }
      }

      setSettings(s);
      setArticles(a || []);
      setStats(st || { totalProtectedVisits: 0, blockedBots: 0, fbVisits: 0, safeClicksGenerated: 0, revenueProtected: 0 });
    } catch (e) {
      console.error('Dashboard Error:', e);
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
        alert('تم حفظ الإعدادات وتحديث محرك الحماية بنجاح ✅');
      } catch (e) { alert('فشل الحفظ ❌'); }
    }
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = editingArticle?.content || '';
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    let newContent = '';
    if (tag === 'h2') newContent = `${before}<h2>${selected}</h2>${after}`;
    else if (tag === 'h3') newContent = `${before}<h3>${selected}</h3>${after}`;
    else if (tag === 'b') newContent = `${before}<b>${selected}</b>${after}`;
    else if (tag === 'p') newContent = `${before}<p>${selected}</p>${after}`;
    else if (tag === 'br') newContent = `${before}${selected}<br/>${after}`;
    else if (tag === 'img') newContent = `${before}<img src="رابط_الصورة_هنا" class="w-full rounded-2xl my-6" />${after}`;
    else if (tag === 'link') newContent = `${before}<a href="URL" class="text-blue-600 underline">${selected}</a>${after}`;

    setEditingArticle({ ...editingArticle, content: newContent });
  };

  const handleSaveArticle = async () => {
    if (!editingArticle?.title || !editingArticle?.category) {
      alert('يجب إدخال العنوان والقسم');
      return;
    }
    try {
      const finalArticle: NewsItem = {
        id: editingArticle.id || Math.random().toString(36).substr(2, 9),
        title: editingArticle.title,
        excerpt: editingArticle.excerpt || (editingArticle.content?.substring(0, 150).replace(/<[^>]*>/g, '') + '...'),
        content: editingArticle.content || '',
        category: editingArticle.category,
        image: editingArticle.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800',
        videoEmbed: editingArticle.videoEmbed || '',
        date: editingArticle.date || new Date().toLocaleDateString('ar-EG')
      };
      await adGuard.saveArticle(finalArticle);
      setEditingArticle(null);
      loadAllData();
      alert('تم النشر بنجاح 🎉');
    } catch (e) { alert('فشل النشر ❌'); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">جاري الدخول إلى النظام...</div>;
  if (!settings) return <div className="p-20 text-center font-black">خطأ في الاتصال</div>;

  return (
    <div className={`mx-auto ${editingArticle ? 'max-w-full' : 'max-w-7xl px-4'} py-6`} dir="rtl">
      {!editingArticle && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-gray-100">
          <div className="text-center md:text-right">
            <h1 className="text-xl md:text-2xl font-black text-gray-900">إدارة {settings.siteName}</h1>
            <p className="text-[10px] font-black text-green-600 uppercase mt-1">نظام الحماية AdSense Shield Active v5.0</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <button onClick={() => window.location.reload()} className="flex-1 md:flex-none px-6 py-3 bg-gray-50 rounded-2xl text-xs font-black hover:text-red-500 transition-colors">خروج</button>
             <button onClick={onBack} className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg">معاينة الموقع</button>
          </div>
        </div>
      )}

      {!editingArticle && (
        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {[
            { id: 'analytics', label: 'الإحصائيات', icon: '📊' },
            { id: 'articles', label: 'المقالات', icon: '✍️' },
            { id: 'ads', label: 'الإعلانات', icon: '💰' },
            { id: 'shield', label: 'الأمان', icon: '🛡️' },
            { id: 'general', label: 'الإعدادات', icon: '⚙️' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && !editingArticle && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4">👥</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">زيارات مفلترة</p>
              <p className="text-3xl font-black mt-1 text-gray-900">{stats?.totalProtectedVisits || 0}</p>
           </div>
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <div className="bg-purple-50 text-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4">📱</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">زيارات فيسبوك</p>
              <p className="text-3xl font-black mt-1 text-purple-600">{stats?.fbVisits || 0}</p>
           </div>
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <div className="bg-green-50 text-green-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4">🛡️</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">حالة الأمان</p>
              <p className="text-3xl font-black mt-1 text-green-600">نشط</p>
           </div>
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <div className="bg-red-50 text-red-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4">💎</div>
              <p className="text-[10px] font-black text-gray-400 uppercase">النقرات المحمية</p>
              <p className="text-3xl font-black mt-1 text-red-600">{stats?.safeClicksGenerated || 0}</p>
           </div>
        </div>
      )}

      {activeTab === 'ads' && !editingArticle && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-4 border-r-4 border-yellow-500 pr-4">خريطة الإعلانات المحمية</h3>
            <p className="text-xs text-gray-400 mb-8 px-5">يتم حقن وسم الـ INS دائماً لضمان توافق السياسات، وتأخير طلب الإعلان (Push) فقط.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {(settings.customAdPlacements || []).map((pos, idx) => (
                 <div key={pos.id} className="p-6 border border-gray-50 rounded-3xl bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={pos.isActive} onChange={e => {
                            const updated = [...settings.customAdPlacements];
                            updated[idx].isActive = e.target.checked;
                            setSettings({...settings, customAdPlacements: updated});
                          }} className="w-5 h-5 accent-blue-600 rounded-lg" />
                          <span className="text-[10px] font-black text-gray-400 uppercase">تفعيل الموضع</span>
                       </label>
                       <span className="text-[11px] font-black text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm">{pos.name}</span>
                    </div>
                    <textarea 
                      value={pos.code || ''} 
                      onChange={e => {
                        const updated = [...settings.customAdPlacements];
                        updated[idx].code = e.target.value;
                        setSettings({...settings, customAdPlacements: updated});
                      }} 
                      placeholder="ألصق كود أدسنس القياسي هنا..."
                      rows={5}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-mono text-[10px] outline-none text-left"
                      dir="ltr"
                    />
                 </div>
               ))}
            </div>
            <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
               <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block">معرف الناشر العام (Ad Client)</label>
               <input type="text" placeholder="ca-pub-XXXXXXXXXXXXXXXX" value={settings.adClient || ''} onChange={e => setSettings({...settings, adClient: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold border-none outline-none text-center" dir="ltr" />
            </div>
            <button onClick={() => handleSaveSettings()} className="mt-10 w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all">تحديث الوحدات فوراً</button>
          </div>
        </div>
      )}

      {activeTab === 'articles' && (
        <div className="animate-in fade-in duration-500">
           {!editingArticle ? (
             <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-10">
                 <button onClick={() => setEditingArticle({})} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl">+ إضافة خبر جديد</button>
                 <h3 className="text-xl font-black border-r-4 border-indigo-600 pr-4">المقالات</h3>
               </div>
               <div className="grid gap-4">
                 {articles.map(art => (
                   <div key={art.id} className="p-4 border border-gray-50 rounded-[25px] flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition-all">
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setEditingArticle(art)} className="flex-1 md:flex-none px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-xs">تعديل</button>
                        <button onClick={async () => { if(confirm('حذف؟')) { await adGuard.deleteArticle(art.id); loadAllData(); } }} className="flex-1 md:flex-none px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs">حذف</button>
                      </div>
                      <div className="flex items-center gap-6 text-right flex-1 justify-end">
                        <div>
                          <h5 className="font-black text-sm text-gray-900">{art.title}</h5>
                          <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{art.category}</span>
                        </div>
                        <img src={art.image} className="w-16 h-16 rounded-2xl object-cover" />
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <div className="fixed inset-0 z-[100] bg-white overflow-y-auto p-4 md:p-10 animate-in slide-in-from-bottom duration-500">
                <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100">
                     <button onClick={() => setEditingArticle(null)} className="bg-gray-100 px-6 py-3 rounded-xl font-black text-xs hover:bg-red-50 hover:text-red-500 transition-all">إغلاق المحرر ×</button>
                     <div className="text-right">
                        <h3 className="text-2xl font-black text-gray-900">المحرر الاحترافي للمقالات</h3>
                        <p className="text-[10px] font-black text-gray-400 mt-1 uppercase">باسم شبكة {settings.siteName}</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                     <div className="lg:col-span-3 space-y-8">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black uppercase text-gray-400">العنوان العريض</label>
                           <input type="text" value={editingArticle.title || ''} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-gray-50 p-6 rounded-3xl font-black text-2xl md:text-3xl border-none outline-none text-right shadow-inner" placeholder="اكتب العنوان هنا..." />
                        </div>
                        
                        <div className="space-y-3">
                           <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-2xl mb-2 sticky top-0 z-10 border border-gray-100 shadow-sm">
                              {['h2', 'h3', 'b', 'p', 'br', 'img', 'link'].map(tag => (
                                <button key={tag} onClick={() => insertTag(tag)} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white shadow-sm transition-all">{tag}</button>
                              ))}
                           </div>
                           <textarea 
                             ref={textareaRef}
                             rows={30} 
                             value={editingArticle.content || ''} 
                             onChange={e => setEditingArticle({...editingArticle, content: e.target.value})} 
                             className="w-full bg-gray-50 p-8 md:p-14 rounded-[40px] font-medium leading-[2.2] text-lg md:text-xl outline-none text-right shadow-inner min-h-[600px]" 
                             placeholder="ابدأ بسرد تفاصيل الخبر..." 
                           />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-gray-50 p-8 rounded-[40px] space-y-6 shadow-inner">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">تصنيف الخبر</label>
                              <select value={editingArticle.category || ''} onChange={e => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold border-none outline-none text-right">
                                 <option value="">اختر القسم...</option>
                                 {(settings.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                           
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">غلاف المقال</label>
                              <div className="bg-white p-4 rounded-2xl text-center border border-gray-100">
                                 {editingArticle.image && <img src={editingArticle.image} className="w-full h-40 object-cover rounded-xl mb-4" />}
                                 <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-black text-gray-400">اختر صورة</button>
                                 <input type="file" hidden ref={fileInputRef} onChange={(e) => {
                                   const f = e.target.files?.[0];
                                   if(f) { const r = new FileReader(); r.onloadend = () => setEditingArticle({...editingArticle, image: r.result as string}); r.readAsDataURL(f); }
                                 }} accept="image/*" />
                              </div>
                           </div>
                           
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">كود الفيديو (Iframe)</label>
                              <input type="text" placeholder="<iframe>...</iframe>" value={editingArticle.videoEmbed || ''} onChange={e => setEditingArticle({...editingArticle, videoEmbed: e.target.value})} className="w-full bg-white p-4 rounded-xl font-mono text-[10px] text-left border border-gray-100" dir="ltr" />
                           </div>
                        </div>
                        
                        <button onClick={handleSaveArticle} className="w-full bg-blue-600 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl hover:bg-blue-700 transition-all">نشر المقال الآن</button>
                     </div>
                  </div>
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'shield' && !editingArticle && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in fade-in duration-500 text-right">
           <h3 className="text-xl font-black mb-4 border-r-4 border-red-600 pr-4">محرك الحماية (AdSense Guard)</h3>
           <p className="text-xs text-gray-400 mb-8 px-5">هذه الإعدادات هي سر نجاح المشروع في حماية حسابك من التقييد.</p>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">ثواني التأخير لزوار فيسبوك</label>
                <input type="number" value={settings.fbStayDuration} onChange={e => setSettings({...settings, fbStayDuration: parseInt(e.target.value)})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">نسبة التمرير المطلوبة (0-100)</label>
                <input type="number" value={settings.minScrollDepth} onChange={e => setSettings({...settings, minScrollDepth: parseInt(e.target.value)})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-right" />
              </div>
           </div>
           <button onClick={() => handleSaveSettings()} className="mt-12 bg-red-600 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl">حفظ إعدادات الأمان</button>
        </div>
      )}

      {activeTab === 'general' && !editingArticle && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in fade-in duration-500 text-right">
           <h3 className="text-xl font-black mb-8 border-r-4 border-gray-900 pr-4">إعدادات الموقع</h3>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">اسم شبكة الأخبار</label>
                <input type="text" value={settings.siteName || ''} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-black outline-none text-right" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">أقسام الموقع</label>
                <div className="flex gap-2">
                   <button onClick={() => { if(newCategory) { const cats = settings.categories || []; if(!cats.includes(newCategory)) setSettings({...settings, categories: [...cats, newCategory]}); setNewCategory(''); } }} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-black text-[10px]">إضافة</button>
                   <input type="text" placeholder="قسم جديد..." value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 bg-gray-50 p-5 rounded-2xl font-black outline-none text-right" />
                </div>
              </div>
           </div>
           <div className="mt-8 flex flex-wrap gap-2 justify-end">
              {settings.categories?.map(cat => (
                <span key={cat} className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-3">
                   <button onClick={() => setSettings({...settings, categories: settings.categories.filter(c => c !== cat)})} className="text-red-400 hover:text-red-600">×</button>
                   {cat}
                </span>
              ))}
           </div>
           <button onClick={() => handleSaveSettings()} className="mt-12 bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl">حفظ التغييرات</button>
        </div>
      )}
    </div>
  );
};
