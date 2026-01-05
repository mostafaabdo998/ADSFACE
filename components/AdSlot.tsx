
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

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

  // جلب الإعدادات مرة واحدة عند تركيب المكون
  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  // التحقق من الأمان وحقن السكريبت الرئيسي
  useEffect(() => {
    if (!settings) return;

    const safetyCheck = async () => {
      const isSafe = await adGuard.checkSafety(settings);
      if (isSafe) {
        setIsReady(true);
        if (settings.adClient) adGuard.injectAdSense(settings.adClient);
      }
    };

    const interval = setInterval(safetyCheck, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  // التحكم في طبقة الحماية (Mask)
  useEffect(() => {
    if (isReady && showMask) {
      const timer = setTimeout(() => {
        setShowMask(false);
      }, adGuard.getVisitorSource() === 'other' ? 500 : 2500);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask]);

  // الرندر الفعلي للإعلان عند توفر الظروف
  useEffect(() => {
    if (!showMask && isReady && settings && !pushedRef.current) {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      // استخدام IntersectionObserver لضمان أن العنصر مستقر في الـ Layout
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentContainer.offsetWidth > 0) {
          renderAdNow();
          observer.disconnect();
        }
      }, { threshold: 0.1 });

      observer.observe(currentContainer);
      return () => observer.disconnect();
    }
  }, [showMask, isReady, settings]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    currentContainer.innerHTML = ''; // تنظيف أي محتوى سابق

    if (hasCustomCode && placement) {
      const div = document.createElement('div');
      div.style.width = '100%';
      div.innerHTML = placement.code;
      currentContainer.appendChild(div);

      if (placement.code.includes('adsbygoogle')) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          pushedRef.current = true;
        } catch (e) { console.error("AdSense Push Error (Custom):", e); }
      }
    } else {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minHeight = '100px';
      
      ins.setAttribute('data-ad-client', settings.adClient.trim());
      ins.setAttribute('data-ad-slot', (adSlot || settings.adSlotMain).trim());
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
    <div className="my-8 w-full flex flex-col items-center justify-center">
      <div 
        className={`w-full max-w-full transition-all duration-500 ${showMask ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 min-h-[100px]'}`}
      >
        <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden" />
      </div>
      
      {showMask && (
        <div className="w-full h-24 flex flex-col items-center justify-center bg-gray-50/30 rounded-[32px] border border-dashed border-gray-100 animate-pulse">
           <div className="flex flex-col items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-600/10 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">AdGuard: Securing Space</p>
           </div>
        </div>
      )}
    </div>
  );
};
