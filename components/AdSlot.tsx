
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string; 
  adSlot?: string;      
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';      
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, adSlot, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushedRef = useRef(false);
  const source = adGuard.getVisitorSource();

  // 1. جلب الإعدادات
  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  // 2. فحص الأمان والحماية
  useEffect(() => {
    if (!settings) return;

    const safetyInterval = setInterval(async () => {
      const isSafe = await adGuard.checkSafety(settings);
      if (isSafe) {
        setIsReady(true);
        if (settings.adClient) {
          adGuard.injectAdSense(settings.adClient);
        }
        clearInterval(safetyInterval);
      }
    }, 1000);

    return () => clearInterval(safetyInterval);
  }, [settings]);

  // 3. إدارة الماسك والبدء في طلب الإعلان
  useEffect(() => {
    if (isReady && showMask) {
      // وقت الانتظار بناءً على المصدر (فيسبوك يحتاج وقت أطول للفلترة)
      const waitTime = source === VisitorSource.OTHER ? 1000 : 4000;
      const timer = setTimeout(() => {
        setShowMask(false);
        // ننتظر قليلاً بعد إخفاء الماسك لضمان استقرار العرض (Width)
        setTimeout(() => renderAdNow(), 300);
      }, waitTime);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;

    // التأكد من أن الحاوية لها عرض حقيقي قبل الـ Push
    if (currentContainer.offsetWidth === 0) {
      console.warn(`AdSlot ${placementId}: Available width is still 0, retrying...`);
      setTimeout(renderAdNow, 500);
      return;
    }

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    if (hasCustomCode && placement) {
      const adWrapper = document.createElement('div');
      adWrapper.className = 'ad-inner-wrapper';
      adWrapper.style.width = '100%';
      adWrapper.innerHTML = placement.code;
      currentContainer.appendChild(adWrapper);

      if (placement.code.includes('adsbygoogle')) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          pushedRef.current = true;
        } catch (e) { console.error("AdSense Push Error (Custom):", e); }
      }
    } else {
      // إنشاء وحدة إعلانية قياسية متوافقة مع السياسات
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.height = 'auto';
      
      ins.setAttribute('data-ad-client', settings.adClient);
      ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (e) { console.error("AdSense Push Error (Default):", e); }
    }
  };

  return (
    <div className="my-10 w-full flex flex-col items-center justify-center">
      {/* حاوية الإعلان المحجوزة المساحة */}
      <div 
        className={`relative w-full max-w-full overflow-hidden transition-all duration-700 ease-in-out border border-transparent
          ${showMask ? 'min-h-[100px] opacity-0' : 'min-h-[280px] opacity-100'}`}
        style={{ width: '100%' }}
      >
        <div ref={containerRef} className="w-full flex justify-center items-center" />
        
        {/* طبقة الحماية (تظهر فقط أثناء الفحص) */}
        {showMask && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200">
             <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-blue-100">
                   AdGuard Protected • {isReady ? 'جارِ التحميل' : 'فحص الأمان'}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
