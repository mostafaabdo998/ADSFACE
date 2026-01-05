
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
  const retryRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const interval = setInterval(async () => {
      const isSafe = await adGuard.checkSafety(settings);
      if (isSafe) {
        setIsReady(true);
        if (settings.adClient) adGuard.injectAdSense(settings.adClient);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  useEffect(() => {
    if (isReady && showMask) {
      const timer = setTimeout(() => {
        setShowMask(false);
      }, adGuard.getVisitorSource() === 'other' ? 400 : 2800);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask]);

  // نظام مراقب الثبات
  useEffect(() => {
    if (!showMask && isReady && settings && !pushedRef.current) {
      const monitorLayout = () => {
        const container = containerRef.current;
        if (!container) return;

        // التحقق من أن الحاوية لها عرض حقيقي وغير مخفية
        const width = container.offsetWidth;
        if (width > 0) {
          // انتظار استقرار نهائي (Final Paint)
          setTimeout(() => {
            if (container.offsetWidth > 0) renderAd();
          }, 150);
        } else if (retryRef.current < 50) {
          retryRef.current++;
          requestAnimationFrame(monitorLayout);
        }
      };

      monitorLayout();
    }
  }, [showMask, isReady, settings]);

  const renderAd = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    // تنظيف الحاوية لضمان عدم وجود بقايا من رندر سابق (مهم جداً في React)
    currentContainer.innerHTML = '';

    if (hasCustomCode && placement) {
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.innerHTML = placement.code;
      currentContainer.appendChild(wrapper);

      if (placement.code.includes('adsbygoogle')) {
        executePush();
      }
    } else {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minHeight = '100px';
      ins.style.minWidth = '250px';
      
      ins.setAttribute('data-ad-client', settings.adClient.trim());
      ins.setAttribute('data-ad-slot', (adSlot || settings.adSlotMain).trim());
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      executePush();
    }
  };

  const executePush = () => {
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      pushedRef.current = true;
    } catch (e) {
      console.error("AdSense Push Failure:", e);
    }
  };

  return (
    <div className="my-8 w-full flex flex-col items-center justify-center overflow-visible">
      <div 
        className={`w-full max-w-full transition-opacity duration-700 ${showMask ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 min-h-[100px]'}`}
      >
        <div ref={containerRef} className="w-full flex justify-center items-center" />
      </div>
      
      {showMask && (
        <div className="w-full h-24 flex flex-col items-center justify-center bg-gray-50/20 rounded-[32px] border border-dashed border-gray-100/50">
           <div className="flex flex-col items-center gap-2">
              <div className="w-3 h-3 border border-blue-600/10 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em]">Shielding Active</p>
           </div>
        </div>
      )}
    </div>
  );
};
