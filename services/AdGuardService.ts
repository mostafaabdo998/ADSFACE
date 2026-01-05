
import { VisitorSource, SiteSettings, NewsItem, ShieldStats } from '../types';
import { supabase } from '../lib/supabase';

class AdGuardService {
  private static instance: AdGuardService;
  private isVerified: boolean = false;
  private startTime: number = Date.now();
  private hasInteracted: boolean = false;
  private maxScroll: number = 0;
  private visitorSource: VisitorSource = VisitorSource.OTHER;
  private isAdSenseInjected: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.detectSource();
      this.initListeners();
      this.maskReferrer();
    }
  }

  public static getInstance(): AdGuardService {
    if (!AdGuardService.instance) AdGuardService.instance = new AdGuardService();
    return AdGuardService.instance;
  }

  private maskReferrer() {
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('fbclid') || url.searchParams.has('gclid')) {
        url.searchParams.delete('fbclid');
        url.searchParams.delete('gclid');
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
    const ua = (navigator.userAgent || '').toLowerCase();
    const isFB = ua.includes('fban') || 
                 ua.includes('fbav') || 
                 ua.includes('facebook') || 
                 ua.includes('fb_iab') ||
                 (document.referrer || '').includes('facebook.com') || 
                 (document.referrer || '').includes('fb.me');
    
    this.visitorSource = isFB ? VisitorSource.FACEBOOK : VisitorSource.OTHER;
  }

  private initListeners() {
    const updateScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) : 0;
      if (scrolled > this.maxScroll) this.maxScroll = scrolled;
    };

    window.addEventListener('scroll', updateScroll, { passive: true });

    const interactionHandler = () => { 
      this.hasInteracted = true; 
      window.removeEventListener('mousemove', interactionHandler); 
      window.removeEventListener('touchstart', interactionHandler); 
      window.removeEventListener('scroll', interactionHandler);
      window.removeEventListener('keydown', interactionHandler);
    };
    window.addEventListener('mousemove', interactionHandler);
    window.addEventListener('touchstart', interactionHandler);
    window.addEventListener('scroll', interactionHandler);
    window.addEventListener('keydown', interactionHandler);
  }

  public async checkSafety(settings: SiteSettings): Promise<boolean> {
    if (this.isVerified) return true;
    
    // منع العرض في المتصفحات الصغيرة جداً (بوتات الاختبار)
    if (window.innerWidth < 100 || window.innerHeight < 100) return false;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource !== VisitorSource.OTHER ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
    const scrollDepth = this.maxScroll * 100;

    const isSafe = elapsed >= required && scrollDepth >= (settings.minScrollDepth || 20) && this.hasInteracted;
    
    if (isSafe) {
      this.isVerified = true;
      const stats = await this.getStats();
      if (stats) await supabase.from('stats').update({ safeClicksGenerated: (stats.safeClicksGenerated || 0) + 1 }).eq('id', 1);
    }
    return isSafe;
  }

  public injectAdSense(publisherId: string) {
    if (typeof window === 'undefined') return;
    if (this.isAdSenseInjected) return;

    const cleanId = publisherId.trim();
    if (!cleanId) return;

    // التأكد من عدم وجود سكريبت سابق
    if (document.querySelector(`script[src*="adsbygoogle.js"]`)) {
      this.isAdSenseInjected = true;
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cleanId}`;
    script.crossOrigin = "anonymous";
    script.onload = () => { this.isAdSenseInjected = true; };
    
    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    document.head.appendChild(script);
  }

  public getVisitorSource() { return this.visitorSource; }
}

export const adGuard = AdGuardService.getInstance();
