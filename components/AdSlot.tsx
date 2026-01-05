
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string;
  adSlot?: string;
  format?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, adSlot, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const source = adGuard.getVisitorSource();

  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    }).catch(e => console.error("AdSlot: Settings error", e));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings) return;

    const safetyInterval = setInterval(async () => {
      const isSafe = await adGuard.checkSafety(settings);
      if (isSafe) {
        setIsReady(true);
        // حقن الملف الرئيسي لأدسنس فور التأكد من أمان الزائر
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
      const maskDuration = source === VisitorSource.OTHER ? 1500 : 3500;
      const timer = setTimeout(() => setShowMask(false), maskDuration);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask, source]);

  useEffect(() => {
    if (isReady && containerRef.current && settings) {
      containerRef.current.innerHTML = ''; 
      
      const placement = settings.customAdPlacements?.find(p => p.id === placementId);
      const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

      if (hasCustomCode && placement) {
        try {
          // نقوم بتنظيف الكود المخصص وحقنه
          const cleanCode = placement.code?.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") || "";
          containerRef.current.innerHTML = cleanCode;
          
          // إذا كان الكود يحتوي على إعلان أدسنس، نقوم بتفعيله يدوياً
          if (placement.code?.includes('adsbygoogle')) {
            setTimeout(() => {
              try {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
              } catch (e) {
                console.warn("AdSense manual push error: ", e);
              }
            }, 100);
          }
        } catch (e) {
          console.error("AdSlot: Custom code processing error", e);
        }
      } else {
        // الإعلان الافتراضي إذا لم يوجد كود مخصص
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.minHeight = '100px';
        ins.setAttribute('data-ad-client', settings.adClient);
        ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
        ins.setAttribute('data-ad-format', format);
        ins.setAttribute('data-full-width-responsive', 'true');
        containerRef.current.appendChild(ins);
        
        setTimeout(() => {
          try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          } catch (e) {}
        }, 100);
      }
    }
  }, [isReady, settings, adSlot, format, placementId]);

  return (
    <div className="my-10 relative min-h-[120px] bg-gray-50/50 flex items-center justify-center border border-dashed border-gray-100 overflow-hidden rounded-[24px]">
      {!isReady && (
        <div className="text-gray-300 text-[10px] p-6 text-center flex flex-col items-center gap-2 font-black uppercase tracking-widest">
           <div className="w-4 h-4 border border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
           <p>جاري فحص أمان الاتصال...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full flex justify-center" />
      {isReady && showMask && (
        <div className="ad-mask bg-white/70 backdrop-blur-[1px] transition-opacity duration-500 animate-pulse"></div>
      )}
    </div>
  );
};
