
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
  private cachedSettings: SiteSettings | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.detectSource();
      this.initEventListeners();
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
    // إذا كان بوت زاحف (SEO Bot)، نفعله فوراً
    if (this.isBot) {
      this.isVerified = true;
      this.notifyListeners();
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

  private initEventListeners() {
    const checkAction = () => {
      if (this.isVerified) return;
      this.checkSafety();
    };

    window.addEventListener('scroll', () => {
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) : 0;
      if (scrolled > this.maxScroll) this.maxScroll = scrolled;
      checkAction();
    }, { passive: true });

    ['mousedown', 'touchstart', 'keydown'].forEach(ev => {
      window.addEventListener(ev, () => {
        this.hasInteracted = true;
        checkAction();
      }, { once: true });
    });
  }

  private async checkSafety() {
    if (this.isVerified) return;
    
    const settings = this.cachedSettings || await this.getSettings();
    if (!settings) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const required = this.visitorSource === VisitorSource.FACEBOOK ? (settings.fbStayDuration || 12) : (settings.otherStayDuration || 3);
    const scrollDepth = this.maxScroll * 100;

    if (elapsed >= required && scrollDepth >= (settings.minScrollDepth || 20) && this.hasInteracted) {
      this.isVerified = true;
      this.notifyListeners();
    }
  }

  public async getSettings(): Promise<SiteSettings | null> {
    if (this.cachedSettings) return this.cachedSettings;
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      this.cachedSettings = data as SiteSettings;
      return this.cachedSettings;
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
    // بوتات الأرشفة فقط هي من تتجاوز الفحص لضمان الـ SEO
    // بوتات مراجعة أدسنس (adsbot/mediapartners) يجب أن تعامل كمستخدم عادي لمنع كشف الـ Cloaking
    this.isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot/i.test(ua);

    const isFB = ua.includes('fb') || (document.referrer || '').includes('facebook.com');
    this.visitorSource = isFB ? VisitorSource.FACEBOOK : VisitorSource.OTHER;
  }

  public injectAdSenseGlobal(publisherId: string) {
    if (typeof window === 'undefined' || this.isAdSenseInjected || !publisherId) return;
    const scriptId = 'adsense-global-init';
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
