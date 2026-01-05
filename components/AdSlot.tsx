
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string; 
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';      
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showAd, setShowAd] = useState(false);
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
      const waitTime = adGuard.getVisitorSource() === 'other' ? 100 : 2000;
      const timer = setTimeout(() => setShowAd(true), waitTime);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  useEffect(() => {
    if (showAd && settings && !pushedRef.current) {
      const checkAndRender = () => {
        if (containerRef.current && containerRef.current.offsetWidth > 0) {
          renderAd();
        } else {
          requestAnimationFrame(checkAndRender);
        }
      };
      checkAndRender();
    }
  }, [showAd, settings]);

  const renderAd = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;
    
    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive) return;

    currentContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.innerHTML = placement.code;
    currentContainer.appendChild(wrapper);

    if (placement.code.includes('adsbygoogle')) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (e) {}
    }
  };

  return (
    <div className={`w-full flex justify-center transition-all duration-1000 ${showAd ? 'opacity-100 my-4 md:my-8 min-h-[100px]' : 'opacity-0 h-0 overflow-hidden'}`}>
      <div ref={containerRef} className="w-full flex justify-center items-center" />
    </div>
  );
};
