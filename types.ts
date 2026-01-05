
export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Accepts HTML
  category: string;
  image: string; // Base64 or URL
  videoEmbed?: string; // Optional iframe code
  date: string;
}

export interface AdPlacement {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface ShieldStats {
  totalProtectedVisits: number;
  blockedBots: number;
  fbVisits: number;
  safeClicksGenerated: number;
  revenueProtected: number;
}

export interface SiteSettings {
  siteName: string;
  categories: string[];
  adClient: string;
  adSlotMain: string;
  adSlotSidebar: string;
  fbStayDuration: number;
  otherStayDuration: number;
  minScrollDepth: number;
  trafficShuntingLimit: number;
  enableFirstVisitFilter: boolean;
  customAdPlacements: AdPlacement[];
  adminUsername?: string;
  adminPassword?: string;
}

export enum VisitorSource {
  FACEBOOK = 'facebook',
  MOBILE_FACEBOOK = 'mobile_facebook',
  OTHER = 'other'
}

export type Page = 'home' | 'article' | 'dashboard' | 'login';
