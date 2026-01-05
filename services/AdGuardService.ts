
import { VisitorSource, SiteSettings, NewsItem, ShieldStats } from '../types';
import { supabase } from '../lib/supabase';

type SafetyCallback = (isSafe: boolean) => void;

class AdGuardService {
  private static instance: AdGuardService;
  private isVerified: boolean = false;
  private startTime: number = Date.now();
  private hasInteracted: boolean = false;
  private maxScroll: number = 0;
  private visitorSource: VisitorSource = VisitorSource.OTHER;
  private isAdSenseInjected: boolean = false;
  private isBot: boolean = false;
  private listeners: Set<SafetyCallback> = new Set();

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

  public subscribeToSafety(callback: SafetyCallback) {
    this.listeners.add(callback);
    callback(this.isVerified || this.isBot);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(true));
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
    // قائمة محدثة لزواحف البحث لضمان عدم حجب الإعلانات عنها أبداً
    this.isBot = /googlebot|adsbot|mediapartners|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i.test(ua);

    const isFB = ua.includes('fb') || (document.referrer || '').includes('facebook.com');
    this.visitorSource = isFB ? VisitorSource.FACEBOOK : VisitorSource.OTHER;
  }

  private initListeners() {
    const updateScroll = () => {
      const winScroll = window.scrollY;
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

  public async runSafetyCheck(settings: SiteSettings) {
    if (this.isBot || this.isVerified) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource === VisitorSource.FACEBOOK ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
    const scrollDepth = this.maxScroll * 100;

    if (elapsed >= required && scrollDepth >= (settings.minScrollDepth || 20) && this.hasInteracted) {
      this.isVerified = true;
      this.notifyListeners();
      const stats = await this.getStats();
      if (stats) await supabase.from('stats').update({ safeClicksGenerated: (stats.safeClicksGenerated || 0) + 1 }).eq('id', 1);
    }
  }

  public injectAdSense(publisherId: string) {
    if (typeof window === 'undefined' || this.isAdSenseInjected || !publisherId) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}`;
    script.crossOrigin = "anonymous";
    script.onerror = () => { this.isAdSenseInjected = false; };
    document.head.appendChild(script);
    this.isAdSenseInjected = true;
  }
}

export const adGuard = AdGuardService.getInstance();
