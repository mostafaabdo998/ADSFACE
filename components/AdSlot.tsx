
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string; // pos1, pos2, pos3
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
        // ننتظر قليلاً بعد إخفاء الماسك لضمان أن الحاوية أصبحت مرئية تماماً للمتصفح
        setTimeout(() => renderAdNow(), 100);
      }, maskDuration);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask, source]);

  const renderAdNow = () => {
    if (!containerRef.current || !settings) return;
    const currentContainer = containerRef.current;
    
    // منع تكرار الحقن في نفس الحاوية
    if (currentContainer.querySelector('.adsbygoogle') || currentContainer.innerHTML !== '') return;

    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

    if (hasCustomCode && placement) {
      // حقن الكود المخصص
      const tempDiv = document.createElement('div');
      tempDiv['className'] = 'custom-ad-wrapper';
      tempDiv.style.width = '100%';
      tempDiv.innerHTML = placement.code;
      currentContainer.appendChild(tempDiv);

      // تفعيل أدسنس إذا كان موجوداً في الكود المخصص
      if (placement.code.includes('adsbygoogle')) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) { console.warn("AdSense push failed (custom)", e); }
      }
    } else {
      // حقن الوحدة الافتراضية
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minWidth = '250px'; // ضمان وجود عرض أدنى
      ins.style.minHeight = '150px';
      ins.setAttribute('data-ad-client', settings.adClient);
      ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
      ins.setAttribute('data-ad-format', format);
      ins.setAttribute('data-full-width-responsive', 'true');
      
      currentContainer.appendChild(ins);
      
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) { console.warn("AdSense push failed (default)", e); }
    }
  };

  return (
    <div className="my-10 relative min-h-[200px] w-full bg-gray-50/5 flex items-center justify-center border border-dashed border-gray-100 rounded-[32px] overflow-hidden">
      {!isReady && (
        <div className="p-8 text-center flex flex-col items-center gap-3">
           <div className="w-5 h-5 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">جاري تأمين الاتصال...</p>
        </div>
      )}
      
      {/* الحاوية دائماً موجودة في الـ DOM لتجنب width=0 */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center ${showMask ? 'invisible h-0' : 'visible h-auto'}`} 
      />
      
      {isReady && showMask && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-opacity duration-700">
           <div className="bg-blue-600/5 px-5 py-2.5 rounded-full border border-blue-100 shadow-sm flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">حماية فيسبوك نشطة • AdGuard</span>
           </div>
        </div>
      )}
    </div>
  );
};
