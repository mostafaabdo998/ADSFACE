
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
  const [showAd, setShowAd] = useState(false);
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
    if (isReady) {
      // انتظار بسيط جداً لضمان عدم حدوث وميض (Flicker)
      const waitTime = adGuard.getVisitorSource() === 'other' ? 100 : 1500;
      const timer = setTimeout(() => {
        setShowAd(true);
      }, waitTime);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  useEffect(() => {
    if (showAd && isReady && settings && !pushedRef.current) {
      const monitorLayout = () => {
        const container = containerRef.current;
        if (!container) return;

        if (container.offsetWidth > 0) {
          setTimeout(() => {
            if (container.offsetWidth > 0) renderAd();
          }, 50);
        } else if (retryRef.current < 60) {
          retryRef.current++;
          requestAnimationFrame(monitorLayout);
        }
      };
      monitorLayout();
    }
  }, [showAd, isReady, settings]);

  const renderAd = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;
    
    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    currentContainer.innerHTML = '';

    if (hasCustomCode && placement) {
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.innerHTML = placement.code;
      currentContainer.appendChild(wrapper);
      if (placement.code.includes('adsbygoogle')) executePush();
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
      executePush();
    }
  };

  const executePush = () => {
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      pushedRef.current = true;
    } catch (e) {}
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center transition-opacity duration-1000 ${showAd ? 'opacity-100 py-6' : 'opacity-0 h-0 overflow-hidden'}`}>
      <div ref={containerRef} className="w-full flex justify-center items-center" />
    </div>
  );
};
