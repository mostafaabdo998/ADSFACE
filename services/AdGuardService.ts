
import { VisitorSource, SiteSettings, NewsItem, ShieldStats } from '../types';
import { supabase } from '../lib/supabase';

class AdGuardService {
  private static instance: AdGuardService;
  private isVerified: boolean = false;
  private startTime: number = Date.now();
  private hasInteracted: boolean = false;
  private maxScroll: number = 0;
  private visitorSource: VisitorSource = VisitorSource.OTHER;

  private constructor() {
    this.detectSource();
    this.initListeners();
    this.maskReferrer();
  }

  public static getInstance(): AdGuardService {
    if (!AdGuardService.instance) AdGuardService.instance = new AdGuardService();
    return AdGuardService.instance;
  }

  private maskReferrer() {
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('fbclid')) {
        url.searchParams.delete('fbclid');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }

  public async getSettings(): Promise<SiteSettings | null> {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    } catch (e) {
      return null;
    }
  }

  public async getArticles(): Promise<NewsItem[]> {
    try {
      const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NewsItem[];
    } catch (e) {
      return [];
    }
  }

  public async saveSettings(settings: SiteSettings) {
    try {
      const { error } = await supabase.from('settings').update(settings).eq('id', 1);
      if (error) throw error;
    } catch (e) {
      throw e;
    }
  }

  public async saveArticle(article: NewsItem) {
    try {
      const { error } = await supabase.from('articles').upsert(article);
      if (error) throw error;
    } catch (e) {
      throw e;
    }
  }

  public async deleteArticle(id: string) {
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      throw e;
    }
  }

  public async getStats(): Promise<ShieldStats | null> {
    try {
      const { data, error } = await supabase.from('stats').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as ShieldStats;
    } catch (e) {
      return null;
    }
  }

  public async trackVisit() {
    try {
      const stats = await this.getStats();
      if (!stats) return;
      const isFB = this.visitorSource !== VisitorSource.OTHER;
      await supabase.from('stats').update({
        totalProtectedVisits: (stats.totalProtectedVisits || 0) + 1,
        fbVisits: isFB ? (stats.fbVisits || 0) + 1 : (stats.fbVisits || 0)
      }).eq('id', 1);
    } catch (e) {}
  }

  private detectSource() {
    if (typeof window === 'undefined') return;
    const ua = (navigator.userAgent || '').toLowerCase();
    const isFB = ua.includes('fban') || ua.includes('fbav') || (document.referrer || '').includes('facebook.com') || (document.referrer || '').includes('fb.me');
    this.visitorSource = isFB ? VisitorSource.FACEBOOK : VisitorSource.OTHER;
  }

  private initListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('scroll', () => {
      const scroll = (window.pageYOffset + window.innerHeight) / (document.documentElement.scrollHeight || 1);
      if (scroll > this.maxScroll) this.maxScroll = scroll;
    }, { passive: true });

    const ih = () => { 
      this.hasInteracted = true; 
      window.removeEventListener('mousemove', ih); 
      window.removeEventListener('touchstart', ih); 
      window.removeEventListener('scroll', ih);
    };
    window.addEventListener('mousemove', ih);
    window.addEventListener('touchstart', ih);
    window.addEventListener('scroll', ih);
  }

  public async checkSafety(settings: SiteSettings): Promise<boolean> {
    if (this.isVerified) return true;

    // درع البوتات المتقدم
    if (window.screen.width === 0 || window.screen.height === 0) return false;
    if (navigator.webdriver) return false; // منع المتصفحات الآلية

    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource !== VisitorSource.OTHER ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
    const scrollDepth = this.maxScroll * 100;

    const isSafe = elapsed >= required && scrollDepth >= (settings.minScrollDepth || 25) && this.hasInteracted;
    
    if (isSafe) {
      this.isVerified = true;
      const stats = await this.getStats();
      if (stats) await supabase.from('stats').update({ safeClicksGenerated: (stats.safeClicksGenerated || 0) + 1 }).eq('id', 1);
    }
    return isSafe;
  }

  public injectAdSense(publisherId: string) {
    if (document.getElementById('adsense-main-script')) return;
    const script = document.createElement('script');
    script.id = 'adsense-main-script';
    script.async = true;
    // التأكد من أن الـ publisherId لا يحتوي على فراغات أو أخطاء
    const cleanId = publisherId.trim();
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cleanId}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  public getVisitorSource() { return this.visitorSource; }
}

export const adGuard = AdGuardService.getInstance();
