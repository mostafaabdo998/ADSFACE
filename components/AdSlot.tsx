
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string; // pos1, pos2, pos3
  adSlot?: string;      
  format?: string;      
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, adSlot, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const source = adGuard.getVisitorSource();

  // 1. تحميل الإعدادات
  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  // 2. نظام التحقق من الأمان
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

  // 3. التحكم في الماسك (Ad Masking)
  useEffect(() => {
    if (isReady && showMask) {
      // نطبق تأخير زمني بناءً على مصدر الزيارة
      const maskDuration = source === VisitorSource.OTHER ? 2000 : 5000;
      const timer = setTimeout(() => {
        setShowMask(false);
        // ننتظر حتى تنتهي حركة الاختفاء البصري قبل طلب الإعلان
        setTimeout(() => renderAdNow(), 300);
      }, maskDuration);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask, source]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings) return;
    const currentContainer = containerRef.current;
    
    // منع التكرار
    if (currentContainer.innerHTML !== '') return;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    if (hasCustomCode && placement) {
      // حالة الكود المخصص
      const adWrapper = document.createElement('div');
      adWrapper.style.width = '100%';
      adWrapper.style.display = 'flex';
      adWrapper.style.justifyContent = 'center';
      adWrapper.innerHTML = placement.code;
      currentContainer.appendChild(adWrapper);

      if (placement.code.includes('adsbygoogle')) {
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
        } catch (e) { console.warn("AdSense Push Failed (Custom)", e); }
      }
    } else {
      // حالة الوحدة التلقائية
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minWidth = '250px';
      ins.style.minHeight = '250px'; // حجز مساحة لضمان عدم وجود Width=0
      ins.setAttribute('data-ad-client', settings.adClient);
      ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) { console.warn("AdSense Push Failed (Default)", e); }
    }
  };

  return (
    <div className="my-12 relative min-h-[280px] w-full bg-gray-50/30 flex items-center justify-center border border-dashed border-gray-200 rounded-[32px] overflow-hidden transition-all duration-500">
      {!isReady && (
        <div className="p-8 text-center flex flex-col items-center gap-4 animate-pulse">
           <div className="w-6 h-6 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">فحص أمان الإعلانات...</p>
        </div>
      )}
      
      {/* الحاوية - نستخدم opacity بدلاً من h-0 لضمان أن المتصفح يرى العرض (Width) */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center transition-all duration-700 ${showMask ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} 
      />
      
      {/* طبقة الحماية (الماسك) */}
      {isReady && showMask && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center transition-opacity duration-1000">
           <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-600/5 px-6 py-3 rounded-full border border-blue-100 shadow-sm flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">إعلان محمي • AdGuard Active</span>
              </div>
              <p className="text-[9px] text-gray-400 font-bold">جاري التحقق من سلامة المحتوى الإعلاني...</p>
           </div>
        </div>
      )}
    </div>
  );
};
