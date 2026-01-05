
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
  private isBot: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.detectSource();
      this.initListeners();
    }
  }

  public static getInstance(): AdGuardService {
    if (!AdGuardService.instance) AdGuardService.instance = new AdGuardService();
    return AdGuardService.instance;
  }

  public async getSettings(): Promise<SiteSettings | null> {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    } catch (e) { return null; }
  }

  public async getArticles(): Promise<NewsItem[]> {
    try {
      const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NewsItem[];
    } catch (e) { return []; }
  }

  public async saveSettings(settings: SiteSettings) {
    await supabase.from('settings').update(settings).eq('id', 1);
  }

  public async saveArticle(article: NewsItem) {
    await supabase.from('articles').upsert(article);
  }

  public async deleteArticle(id: string) {
    await supabase.from('articles').delete().eq('id', id);
  }

  public async getStats(): Promise<ShieldStats | null> {
    const { data } = await supabase.from('stats').select('*').eq('id', 1).single();
    return data as ShieldStats;
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
    this.isBot = /googlebot|adsbot|mediapartners|bingbot|slurp/i.test(ua);

    const isFB = ua.includes('fb') || (document.referrer || '').includes('facebook.com');
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
      ['mousemove', 'touchstart', 'scroll', 'keydown'].forEach(ev => window.removeEventListener(ev, interactionHandler));
    };
    ['mousemove', 'touchstart', 'scroll', 'keydown'].forEach(ev => window.addEventListener(ev, interactionHandler));
  }

  public async checkSafety(settings: SiteSettings): Promise<boolean> {
    if (this.isBot) return true;
    if (this.isVerified) return true;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource === VisitorSource.FACEBOOK ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
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
    if (typeof window === 'undefined' || this.isAdSenseInjected) return;

    const existing = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existing) {
      this.isAdSenseInjected = true;
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    this.isAdSenseInjected = true;
  }
}

export const adGuard = AdGuardService.getInstance();
