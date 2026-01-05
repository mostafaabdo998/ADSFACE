
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
  // الحل 1: استخدام useRef مرتبط بدورة حياة DOM المكون فقط
  const pushedRef = useRef(false);
  const source = adGuard.getVisitorSource();

  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

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

  useEffect(() => {
    if (isReady && showMask) {
      const waitTime = source === VisitorSource.OTHER ? 800 : 3500;
      const timer = setTimeout(() => {
        setShowMask(false);
      }, waitTime);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask]);

  // الحل 2: فحص العرض بشكل دوري قبل التنفيذ
  useEffect(() => {
    if (!showMask && isReady && settings && !pushedRef.current) {
      let retryCount = 0;
      const checkAndRender = () => {
        if (!containerRef.current) return;
        
        // التأكد من أن العرض أكبر من 0 حقيقةً
        if (containerRef.current.offsetWidth > 0) {
          renderAdNow();
        } else if (retryCount < 20) { // محاولة لـ 10 ثوانٍ كحد أقصى
          retryCount++;
          requestAnimationFrame(checkAndRender);
        }
      };
      
      checkAndRender();
    }
  }, [showMask, isReady, settings]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    // مسح أي محتوى سابق (في حالة إعادة الـ Render)
    currentContainer.innerHTML = '';

    if (hasCustomCode && placement) {
      const adWrapper = document.createElement('div');
      adWrapper.style.width = '100%';
      adWrapper.innerHTML = placement.code;
      currentContainer.appendChild(adWrapper);

      if (placement.code.includes('adsbygoogle')) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          pushedRef.current = true;
        } catch (e) { console.warn("AdSense push failed", e); }
      }
    } else {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minHeight = '100px';
      
      ins.setAttribute('data-ad-client', settings.adClient);
      ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (e) { console.warn("AdSense push failed", e); }
    }
  };

  return (
    <div className="my-10 w-full min-h-[100px] flex flex-col items-center justify-center">
      <div 
        className={`w-full max-w-full transition-opacity duration-1000 ${showMask ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}
      >
        <div ref={containerRef} className="w-full flex justify-center items-center" />
      </div>
      
      {showMask && (
        <div className="w-full h-24 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-100 animate-pulse">
           <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">تأمين مساحة الإعلان...</p>
           </div>
        </div>
      )}
    </div>
  );
};
