
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
        { id: 'pos_bottom', name: 'إعلان أسفل المقال', code: '', isActive: true }
      ];

      if (s) {
        if (!s.customAdPlacements || s.customAdPlacements.length === 0) {
          s.customAdPlacements = defaultPlacements;
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
        alert('تم حفظ الإعدادات بنجاح ✅');
      } catch (e) { alert('فشل الحفظ ❌'); }
    }
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
        date: editingArticle.date || new Date().toLocaleDateString('ar-EG')
      };
      await adGuard.saveArticle(finalArticle);
      setEditingArticle(null);
      loadAllData();
      alert('تم النشر بنجاح 🎉');
    } catch (e) { alert('فشل النشر ❌'); }
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
    else if (tag === 'p') newContent = `${before}<p>${selected}</p>${after}`;
    else if (tag === 'b') newContent = `${before}<b>${selected}</b>${after}`;
    setEditingArticle({ ...editingArticle, content: newContent });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">جاري التحميل...</div>;
  if (!settings) return <div className="p-20 text-center font-black">خطأ في الاتصال</div>;

  return (
    <div className={`mx-auto ${editingArticle ? 'max-w-full' : 'max-w-7xl px-4'} py-6`} dir="rtl">
      {!editingArticle && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-gray-100">
          <div className="text-center md:text-right">
            <h1 className="text-xl md:text-2xl font-black text-gray-900">إدارة {settings.siteName}</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase mt-1">تنسيق الإعلانات البسيط</p>
          </div>
          <div className="flex gap-3">
             <button onClick={onBack} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg">معاينة الموقع</button>
          </div>
        </div>
      )}

      {!editingArticle && (
        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {[
            { id: 'analytics', label: 'الإحصائيات', icon: '📊' },
            { id: 'articles', label: 'المقالات', icon: '✍️' },
            { id: 'ads', label: 'الإعلانات', icon: '💰' },
            { id: 'shield', label: 'التأخير الزمني', icon: '⏳' },
            { id: 'general', label: 'الإعدادات', icon: '⚙️' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && !editingArticle && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي الزيارات</p>
              <p className="text-3xl font-black mt-1 text-gray-900">{stats?.totalProtectedVisits || 0}</p>
           </div>
           <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">حالة الإعلانات</p>
              <p className="text-3xl font-black mt-1 text-green-600">تعمل بتأخير</p>
           </div>
        </div>
      )}

      {activeTab === 'ads' && !editingArticle && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {(settings.customAdPlacements || []).map((pos, idx) => (
                 <div key={pos.id} className="p-6 border border-gray-50 rounded-3xl bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[11px] font-black text-gray-900">{pos.name}</span>
                       <input type="checkbox" checked={pos.isActive} onChange={e => {
                         const updated = [...settings.customAdPlacements];
                         updated[idx].isActive = e.target.checked;
                         setSettings({...settings, customAdPlacements: updated});
                       }} className="w-5 h-5 accent-blue-600" />
                    </div>
                    <textarea 
                      value={pos.code || ''} 
                      onChange={e => {
                        const updated = [...settings.customAdPlacements];
                        updated[idx].code = e.target.value;
                        setSettings({...settings, customAdPlacements: updated});
                      }} 
                      placeholder="كود الإعلان هنا..."
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 font-mono text-[10px] outline-none text-left"
                      dir="ltr"
                    />
                 </div>
               ))}
            </div>
            <div className="p-6 bg-blue-50 rounded-3xl">
               <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block">معرف الناشر (Ad Client)</label>
               <input type="text" value={settings.adClient || ''} onChange={e => setSettings({...settings, adClient: e.target.value})} className="w-full bg-white p-4 rounded-xl font-bold border-none outline-none text-center" dir="ltr" />
            </div>
            <button onClick={() => handleSaveSettings()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all">حفظ وتحديث الإعلانات</button>
        </div>
      )}

      {activeTab === 'shield' && !editingArticle && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in fade-in duration-500 text-right">
           <h3 className="text-xl font-black mb-4 border-r-4 border-blue-600 pr-4">إعدادات تأخير الإعلانات</h3>
           <p className="text-xs text-gray-400 mb-8 px-5">سيتم تطبيق هذا التأخير على كافة الزوار بمجرد فتح الصفحة.</p>
           <div className="max-w-md">
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">عدد ثواني التأخير (الافتراضي 5)</label>
              <input 
                type="number" 
                value={settings.globalAdDelay} 
                onChange={e => setSettings({...settings, globalAdDelay: parseInt(e.target.value) || 0})} 
                className="w-full bg-gray-50 p-5 rounded-2xl font-black text-right border border-gray-100 focus:bg-white transition-all outline-none" 
              />
           </div>
           <button onClick={() => handleSaveSettings()} className="mt-8 bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl">حفظ إعدادات التأخير</button>
        </div>
      )}

      {activeTab === 'articles' && (
        <div className="animate-in fade-in duration-500">
           {!editingArticle ? (
             <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-10">
                 <button onClick={() => setEditingArticle({})} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs">+ إضافة خبر</button>
                 <h3 className="text-xl font-black">المقالات</h3>
               </div>
               <div className="grid gap-4">
                 {articles.map(art => (
                   <div key={art.id} className="p-4 border border-gray-50 rounded-[25px] flex justify-between items-center hover:bg-gray-50 transition-all">
                      <div className="flex gap-2">
                        <button onClick={() => setEditingArticle(art)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px]">تعديل</button>
                        <button onClick={async () => { if(confirm('حذف؟')) { await adGuard.deleteArticle(art.id); loadAllData(); } }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px]">حذف</button>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <h5 className="font-black text-sm text-gray-900">{art.title}</h5>
                        <img src={art.image} className="w-12 h-12 rounded-xl object-cover" />
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                <input type="text" value={editingArticle.title || ''} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-gray-50 p-6 rounded-2xl font-black text-xl text-right outline-none" placeholder="عنوان الخبر..." />
                <div className="flex gap-2 mb-2">
                   {['h2', 'p', 'b'].map(t => <button key={t} onClick={() => insertTag(t)} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-black uppercase">{t}</button>)}
                </div>
                <textarea ref={textareaRef} rows={15} value={editingArticle.content || ''} onChange={e => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-right outline-none" placeholder="محتوى الخبر (HTML)..." />
                <div className="grid md:grid-cols-2 gap-4">
                  <select value={editingArticle.category || ''} onChange={e => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-right outline-none">
                     <option value="">اختر القسم</option>
                     {settings.categories?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={editingArticle.image || ''} onChange={e => setEditingArticle({...editingArticle, image: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-right outline-none" placeholder="رابط الصورة..." />
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={handleSaveArticle} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black">نشر</button>
                  <button onClick={() => setEditingArticle(null)} className="px-10 bg-gray-100 py-4 rounded-2xl font-black">إلغاء</button>
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'general' && !editingArticle && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in fade-in duration-500 text-right">
           <h3 className="text-xl font-black mb-8 border-r-4 border-gray-900 pr-4">إعدادات الموقع</h3>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">اسم الموقع</label>
                <input type="text" value={settings.siteName || ''} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-black outline-none text-right" />
              </div>
           </div>
           <button onClick={() => handleSaveSettings()} className="mt-12 bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl">حفظ التغييرات</button>
        </div>
      )}
    </div>
  );
};
