
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string; 
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId }) => {
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings) return;

    // محرك التحقق من الأمان - صمام الأمان ضد تقييد أدسنس
    const safetyInterval = setInterval(async () => {
      const safe = await adGuard.checkSafety(settings);
      if (safe) {
        setIsSafe(true);
        if (settings.adClient) {
          adGuard.injectAdSense(settings.adClient);
        }
        clearInterval(safetyInterval);
      }
    }, 1000);

    return () => clearInterval(safetyInterval);
  }, [settings]);

  useEffect(() => {
    if (isSafe && settings && !pushedRef.current) {
      // الانتظار حتى استقرار الصفحة تماماً قبل الرندر
      const renderTimer = setTimeout(() => {
        renderAdLogic();
      }, 500); 
      return () => clearTimeout(renderTimer);
    }
  }, [isSafe, settings]);

  const renderAdLogic = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; 

    // حقن الكود الفعلي للإعلان
    const adWrapper = document.createElement('div');
    adWrapper.className = "ad-inner-wrapper w-full flex justify-center";
    adWrapper.innerHTML = placement.code;
    currentContainer.appendChild(adWrapper);

    // تفعيل وحدات AdSense
    if (placement.code.includes('adsbygoogle')) {
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
        pushedRef.current = true;
      } catch (e) {
        console.warn("AdSense push delayed or failed", placementId);
      }
    }
  };

  return (
    <div className={`ad-slot-container w-full flex justify-center transition-all duration-1000 ${isSafe ? 'opacity-100 py-4 md:py-8 min-h-[50px]' : 'opacity-0 h-0 overflow-hidden'}`}>
      <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden" />
    </div>
  );
};
