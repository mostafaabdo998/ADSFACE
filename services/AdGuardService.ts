
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
  private checkInterval: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.detectSource();
      this.initListeners();
      this.startSafetyEngine();
    }
  }

  public static getInstance(): AdGuardService {
    if (!AdGuardService.instance) AdGuardService.instance = new AdGuardService();
    return AdGuardService.instance;
  }

  public subscribeToSafety(callback: SafetyCallback) {
    this.listeners.add(callback);
    callback(this.isVerified || this.isBot);
    return () => { this.listeners.delete(callback); };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(true));
  }

  private async startSafetyEngine() {
    const settings = await this.getSettings();
    if (!settings) return;

    // إذا كان بوت، نقوم بحقن السكريبت فوراً ووسم الجلسة كآمنة
    if (this.isBot) {
      if (settings.adClient) this.injectAdSense(settings.adClient);
      this.isVerified = true;
      this.notifyListeners();
      return;
    }

    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      this.runInternalCheck(settings);
    }, 1000);
  }

  private runInternalCheck(settings: SiteSettings) {
    if (this.isVerified) {
      if (this.checkInterval) clearInterval(this.checkInterval);
      return;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource === VisitorSource.FACEBOOK ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
    const scrollDepth = this.maxScroll * 100;

    if (elapsed >= required && scrollDepth >= (settings.minScrollDepth || 20) && this.hasInteracted) {
      this.isVerified = true;
      if (settings.adClient) this.injectAdSense(settings.adClient);
      this.notifyListeners();
    }
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
    this.startSafetyEngine();
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
    // كشف بوتات أدسنس وجوجل وفيسبوك لضمان الشفافية معهم
    this.isBot = /googlebot|adsbot|mediapartners|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|lighthouse|gtmetrix/i.test(ua);

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

  public injectAdSense(publisherId: string) {
    if (typeof window === 'undefined' || this.isAdSenseInjected || !publisherId) return;
    const scriptId = 'adsense-main-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    this.isAdSenseInjected = true;
  }
}

export const adGuard = AdGuardService.getInstance();
