
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string; // مضاف لتتبع تغيير الصفحة
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, currentPath }) => {
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // إعادة ضبط الحالة عند تغيير الصفحة لضمان إعادة الفحص والحقن
  useEffect(() => {
    setIsSafe(false);
    initialized.current = false;
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, [currentPath]);

  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings || isSafe) return;

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
  }, [settings, isSafe, currentPath]);

  useEffect(() => {
    if (isSafe && settings && !initialized.current) {
      initialized.current = true;
      // نستخدم التوقيت لضمان استقرار المتصفح قبل الحقن
      requestAnimationFrame(() => {
        setTimeout(renderAd, 200);
      });
    }
  }, [isSafe, settings, currentPath]);

  const renderAd = () => {
    if (!containerRef.current || !settings) return;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; 

    const adWrapper = document.createElement('div');
    adWrapper.className = "ad-inner-wrapper w-full flex justify-center";
    adWrapper.innerHTML = placement.code;
    currentContainer.appendChild(adWrapper);

    if (placement.code.includes('adsbygoogle')) {
      try {
        // تأخير بسيط للتأكد من وجود ins tag في الـ DOM
        setTimeout(() => {
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
        }, 150);
      } catch (e) {
        console.warn("AdSense push issue on", placementId);
      }
    }
  };

  return (
    <div className={`ad-slot-wrapper w-full flex justify-center transition-opacity duration-1000 ${isSafe ? 'opacity-100 py-4 md:py-8 min-h-[100px]' : 'opacity-0 h-0 overflow-hidden'}`}>
      <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden" />
    </div>
  );
};
