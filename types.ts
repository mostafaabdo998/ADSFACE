
export interface AdPlacement {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  date: string;
  videoEmbed?: string;
}

export interface SiteSettings {
  siteName: string;
  adClient: string;
  categories: string[];
  customAdPlacements: AdPlacement[];
  globalAdDelay: number; // تأخير ظهور الإعلانات للجميع بالثواني
}

export interface ShieldStats {
  totalProtectedVisits: number;
  fbVisits: number;
  safeClicksGenerated: number;
  blockedBots: number;
  revenueProtected: number;
}

export enum VisitorSource {
  FACEBOOK = 'facebook',
  OTHER = 'other'
}
