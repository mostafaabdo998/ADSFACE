
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, currentPath }) => {
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInjectedRef = useRef(false);
  const checkWidthInterval = useRef<number | null>(null);

  useEffect(() => {
    setIsSafe(false);
    isInjectedRef.current = false;
    if (checkWidthInterval.current) window.clearInterval(checkWidthInterval.current);
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

    const safetyInterval = window.setInterval(async () => {
      const safe = await adGuard.checkSafety(settings);
      if (safe) {
        setIsSafe(true);
        if (settings.adClient) {
          adGuard.injectAdSense(settings.adClient);
        }
        window.clearInterval(safetyInterval);
      }
    }, 800); // تسريع الفحص قليلاً

    return () => window.clearInterval(safetyInterval);
  }, [settings, isSafe, currentPath]);

  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current) {
      // الانتظار حتى استقرار العرض (أهم خطوة)
      checkWidthInterval.current = window.setInterval(() => {
        const el = containerRef.current;
        if (el && el.clientWidth > 100) { // التأكد من وجود عرض حقيقي وليس مجرد 1 بكسل
          window.clearInterval(checkWidthInterval.current!);
          handleAdRender();
        }
      }, 150);
    }
    return () => {
      if (checkWidthInterval.current) window.clearInterval(checkWidthInterval.current);
    };
  }, [isSafe, settings, currentPath]);

  const handleAdRender = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    isInjectedRef.current = true;
    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; 

    // تغليف الكود بـ div يضمن الـ Layout
    const adWrapper = document.createElement('div');
    adWrapper.className = "adsense-inject-point w-full min-h-[100px]";
    adWrapper.style.display = 'block';
    adWrapper.style.width = '100%';
    adWrapper.innerHTML = placement.code;
    
    currentContainer.appendChild(adWrapper);

    const insTag = adWrapper.querySelector('ins.adsbygoogle');
    if (insTag) {
      // إجبار الـ ins على العرض قبل الـ push
      (insTag as HTMLElement).style.display = 'block';
      
      try {
        setTimeout(() => {
          if (!insTag.hasAttribute('data-adsbygoogle-status')) {
            (window as any).adsbygoogle = (window as any).adsbygoogle || [];
            (window as any).adsbygoogle.push({});
          }
        }, 300);
      } catch (e) {
        console.error("AdSense Push Fatal:", placementId);
        isInjectedRef.current = false;
      }
    }
  };

  return (
    <div 
      className="ad-slot-boundary w-full flex justify-center items-center overflow-hidden transition-all duration-700"
      style={{ 
        opacity: isSafe ? 1 : 0,
        visibility: isSafe ? 'visible' : 'hidden',
        minHeight: isSafe ? '100px' : '1px',
        margin: isSafe ? '2rem 0' : '0'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center" 
        style={{ minWidth: '100%' }}
      />
    </div>
  );
};
