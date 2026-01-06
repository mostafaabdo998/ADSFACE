
import { SiteSettings, NewsItem, ShieldStats } from '../types';
import { supabase } from '../lib/supabase';

class AdGuardService {
  private static instance: AdGuardService;
  private cachedSettings: SiteSettings | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadAndInit();
    }
  }

  public static getInstance(): AdGuardService {
    if (!AdGuardService.instance) AdGuardService.instance = new AdGuardService();
    return AdGuardService.instance;
  }

  private async loadAndInit() {
    const settings = await this.getSettings();
    if (settings?.adClient) {
      this.injectAdSenseGlobal(settings.adClient);
    }
  }

  public async getSettings(): Promise<SiteSettings | null> {
    if (this.cachedSettings) return this.cachedSettings;
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error) {
        return {
          siteName: 'أخبار اليوم',
          adClient: 'ca-pub-3940256099942544',
          categories: ['سياسة', 'اقتصاد', 'رياضة', 'تكنولوجيا'],
          customAdPlacements: []
        };
      }
      this.cachedSettings = data as SiteSettings;
      return this.cachedSettings;
    } catch (e) { return null; }
  }

  public async getArticles(): Promise<NewsItem[]> {
    try {
      const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NewsItem[];
    } catch (e) {
      return [
        {
          id: '1',
          title: 'تحديثات الموقع الجديدة',
          excerpt: 'تم اعتماد نظام الإعلانات القياسي لضمان التوافق التام مع السياسات...',
          content: '<p>تم تحديث الموقع ليعمل وفق أفضل ممارسات النشر الإخباري الرقمي، مع ضمان استقرار الإعلانات وسرعة التحميل لجميع الزوار.</p>',
          category: 'تكنولوجيا',
          image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800',
          date: 'اليوم'
        }
      ];
    }
  }

  public async saveSettings(settings: SiteSettings) {
    this.cachedSettings = settings;
    await supabase.from('settings').update(settings).eq('id', 1);
    // تنبيه: تغيير الـ adClient يتطلب تحديث الصفحة (Refresh) لتجنب التدوير البرمجي المحظور
    if (settings.adClient) this.injectAdSenseGlobal(settings.adClient);
  }

  public async saveArticle(article: NewsItem) {
    await supabase.from('articles').upsert(article);
  }

  public async deleteArticle(id: string) {
    await supabase.from('articles').delete().eq('id', id);
  }

  public async getStats(): Promise<ShieldStats | null> {
    const { data } = await supabase.from('stats').select('*').eq('id', 1).single();
    return data || { totalProtectedVisits: 0, fbVisits: 0, safeClicksGenerated: 0, blockedBots: 0, revenueProtected: 0 };
  }

  public async trackVisit() {
    try {
      const { data: stats } = await supabase.from('stats').select('*').eq('id', 1).single();
      if (!stats) return;
      await supabase.from('stats').update({
        totalProtectedVisits: (stats.totalProtectedVisits || 0) + 1
      }).eq('id', 1);
    } catch (e) {}
  }

  /**
   * يحقن سكريبت أدسنس الرئيسي في الـ Head مرة واحدة فقط لكل جلسة.
   * يستخدم flag لمنع الحقن المتكرر (Script Injection Duplication).
   */
  private injectAdSenseGlobal(publisherId: string) {
    if (typeof window === 'undefined' || !publisherId) return;

    // 1. منع الحقن المتكرر لنفس الحساب أو حسابات مختلفة في نفس الجلسة
    if ((window as any).__adsenseInjected) {
      console.log('AdSense script already present. Skipping injection to avoid violations.');
      return;
    }

    const scriptId = 'adsense-global-init';
    if (document.getElementById(scriptId)) return;

    // 2. وضع العلامة قبل البدء لضمان عدم حدوث Race Condition
    (window as any).__adsenseInjected = true;

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}`;
    script.crossOrigin = "anonymous";
    
    // الحقن المبكر والمباشر في الـ head
    document.head.appendChild(script);
    
    console.log('AdSense Global Script Injected Successfully.');
  }
}

export const adGuard = AdGuardService.getInstance();
