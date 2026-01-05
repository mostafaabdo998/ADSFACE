
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
      const triggerAd = () => {
        if (!containerRef.current) return;
        
        // التحقق من أن العرض أكبر من 0 لمنع خطأ availableWidth=0
        if (containerRef.current.offsetWidth === 0) {
          setTimeout(triggerAd, 200);
          return;
        }

        containerRef.current.innerHTML = ''; 
        const placement = settings.customAdPlacements?.find(p => p.id === placementId);
        const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

        if (hasCustomCode && placement) {
          const cleanCode = placement.code?.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") || "";
          containerRef.current.innerHTML = cleanCode;
          
          if (placement.code?.includes('adsbygoogle')) {
            try {
              ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            } catch (e) {
              console.warn("AdSense custom push error:", e);
            }
          }
        } else {
          const ins = document.createElement('ins');
          ins.className = 'adsbygoogle';
          ins.style.display = 'block';
          ins.style.width = '100%'; // إجبار العرض على 100%
          ins.style.minWidth = '250px'; // حد أدنى للعرض
          ins.style.minHeight = '100px';
          ins.setAttribute('data-ad-client', settings.adClient);
          ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
          ins.setAttribute('data-ad-format', format);
          ins.setAttribute('data-full-width-responsive', 'true');
          containerRef.current.appendChild(ins);
          
          try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          } catch (e) {
            console.warn("AdSense default push error:", e);
          }
        }
      };

      // استخدام requestAnimationFrame لضمان أن المتصفح قد انتهى من حساب الأبعاد
      requestAnimationFrame(() => {
        setTimeout(triggerAd, 150);
      });
    }
  }, [isReady, settings, adSlot, format, placementId]);

  return (
    <div className="my-10 relative min-h-[120px] w-full bg-gray-50/50 flex items-center justify-center border border-dashed border-gray-100 overflow-hidden rounded-[24px]">
      {!isReady && (
        <div className="text-gray-300 text-[10px] p-6 text-center flex flex-col items-center gap-2 font-black uppercase tracking-widest">
           <div className="w-4 h-4 border border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
           <p>جاري فحص الأمان...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full flex justify-center" />
      {isReady && showMask && (
        <div className="ad-mask bg-white/70 backdrop-blur-[1px] transition-opacity duration-500"></div>
      )}
    </div>
  );
};
