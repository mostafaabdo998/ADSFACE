
import { SiteSettings, NewsItem, ShieldStats } from '../types';
import { supabase } from '../lib/supabase';

type SafetyCallback = (isSafe: boolean) => void;

class AdGuardService {
  private static instance: AdGuardService;
  private isVerified: boolean = false;
  private startTime: number = Date.now();
  private listeners: Set<SafetyCallback> = new Set();
  private cachedSettings: SiteSettings | null = null;
  private checkInterval: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initTimer();
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

  public subscribeToSafety(callback: SafetyCallback) {
    this.listeners.add(callback);
    callback(this.isVerified);
    return () => { this.listeners.delete(callback); };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.isVerified));
  }

  private initTimer() {
    // التحقق كل ثانية من مرور الوقت المطلوب
    this.checkInterval = setInterval(() => {
      this.checkSafety();
    }, 1000);
  }

  private async checkSafety() {
    if (this.isVerified) {
      if (this.checkInterval) clearInterval(this.checkInterval);
      return;
    }
    
    const settings = this.cachedSettings || await this.getSettings();
    const delay = settings?.globalAdDelay ?? 5; // الافتراضي 5 ثواني
    
    const elapsed = (Date.now() - this.startTime) / 1000;

    if (elapsed >= delay) {
      this.isVerified = true;
      this.notifyListeners();
      if (this.checkInterval) clearInterval(this.checkInterval);
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
          globalAdDelay: 5,
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
          excerpt: 'تم تحديث نظام الإعلانات ليكون أكثر بساطة وسرعة لجميع الزوار...',
          content: '<p>تم إلغاء كافة أنظمة الحماية المعقدة واستبدالها بنظام تأخير بسيط يضمن سلامة الحساب وسلاسة التصفح.</p>',
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

  private injectAdSenseGlobal(publisherId: string) {
    if (typeof window === 'undefined' || !publisherId) return;
    const scriptId = 'adsense-global-init';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }
}

export const adGuard = AdGuardService.getInstance();
