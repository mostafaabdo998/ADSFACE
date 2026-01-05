
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string; // pos1, pos2, pos3
  adSlot?: string;      
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';      
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, adSlot, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
      const maskDuration = source === VisitorSource.OTHER ? 1500 : 4500;
      const timer = setTimeout(() => {
        setShowMask(false);
        // ننتظر قليلاً لضمان رندر الـ DOM بالكامل قبل الحقن
        setTimeout(() => renderAdNow(), 200);
      }, maskDuration);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings || pushedRef.current) return;
    const currentContainer = containerRef.current;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    if (hasCustomCode && placement) {
      const adWrapper = document.createElement('div');
      adWrapper.style.width = '100%';
      adWrapper.style.display = 'block';
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
      ins.style.textAlign = 'center';
      ins.style.width = '100%';
      ins.style.minWidth = '250px';
      ins.style.minHeight = '90px'; // الحد الأدنى المسموح به
      
      ins.setAttribute('data-ad-client', settings.adClient);
      ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
      ins.setAttribute('data-ad-format', format === 'rectangle' ? 'rectangle' : (format === 'horizontal' ? 'horizontal' : 'auto'));
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (e) { console.warn("AdSense push failed", e); }
    }
  };

  return (
    <div className="my-8 relative min-h-[100px] w-full bg-transparent flex flex-col items-center justify-center transition-all duration-500 overflow-hidden">
      {!isReady && (
        <div className="p-4 text-center flex flex-col items-center gap-2">
           <div className="w-4 h-4 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
           <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">تأمين الاتصال...</p>
        </div>
      )}
      
      {/* الحاوية - نستخدم invisible بدلاً من display:none لضمان وجود أبعاد */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center transition-opacity duration-700 ${showMask ? 'invisible h-0' : 'visible h-auto opacity-100'}`} 
      />
      
      {isReady && showMask && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
           <div className="bg-blue-600/5 px-4 py-2 rounded-full border border-blue-100 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">حماية AdGuard نشطة</span>
           </div>
        </div>
      )}
    </div>
  );
};
