
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { VisitorSource, SiteSettings } from '../types';

interface AdSlotProps {
  placementId?: string; // لربط الإعلان بمكان محدد في لوحة التحكم (pos1, pos2, pos3)
  adSlot?: string;      // الـ Slot ID الافتراضي
  format?: string;      // تنسيق الإعلان (auto, rectangle, horizontal)
}

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, adSlot, format = 'auto' }) => {
  const [isReady, setIsReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const source = adGuard.getVisitorSource();

  // 1. تحميل الإعدادات من قاعدة البيانات
  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  // 2. نظام التحقق من الأمان (Safe-Check Algorithm)
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

  // 3. التحكم في طبقة التمويه (Temporary Masking)
  useEffect(() => {
    if (isReady && showMask) {
      // زوار فيسبوك يتم تأخيرهم أكثر لمنع النقرات العارضة
      const maskDuration = source === VisitorSource.OTHER ? 2000 : 5000;
      const timer = setTimeout(() => setShowMask(false), maskDuration);
      return () => clearTimeout(timer);
    }
  }, [isReady, showMask, source]);

  // 4. معالجة الحقن الفعلي للإعلان مع حل مشكلة availableWidth=0
  useEffect(() => {
    if (!isReady || !containerRef.current || !settings) return;

    const currentContainer = containerRef.current;

    // مراقبة حجم العنصر قبل الحقن
    observerRef.current = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // لا نحقن الإعلان إلا إذا كان العرض أكبر من 250 بكسل والحاوية فارغة
        if (width > 240 && currentContainer.innerHTML === '') {
          renderAdLogic();
          observerRef.current?.unobserve(currentContainer);
        }
      }
    });

    observerRef.current.observe(currentContainer);

    const renderAdLogic = () => {
      const placement = settings.customAdPlacements?.find(p => p.id === placementId);
      const hasCustomCode = !!(placement && placement.isActive && placement.code?.trim() !== '');

      if (hasCustomCode && placement) {
        // إذا وجد كود مخصص في لوحة التحكم لهذا المكان
        const cleanCode = placement.code?.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") || "";
        currentContainer.innerHTML = cleanCode;
        
        if (placement.code?.includes('adsbygoogle')) {
          try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          } catch (e) {
            console.warn("Manual push error:", e);
          }
        }
      } else {
        // الإعلان الافتراضي بنظام الـ Dynamic Generation
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.style.minHeight = '100px';
        ins.setAttribute('data-ad-client', settings.adClient);
        ins.setAttribute('data-ad-slot', adSlot || settings.adSlotMain);
        ins.setAttribute('data-ad-format', format);
        ins.setAttribute('data-full-width-responsive', 'true');
        currentContainer.appendChild(ins);
        
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.warn("Default push error:", e);
        }
      }
    };

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isReady, settings, adSlot, format, placementId]);

  return (
    <div className="my-12 relative min-h-[150px] w-full bg-gray-50/20 flex items-center justify-center border border-dashed border-gray-100 overflow-hidden rounded-[32px]">
      {!isReady && (
        <div className="p-8 text-center flex flex-col items-center gap-3">
           <div className="w-5 h-5 border-2 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">جاري فحص جودة الاتصال...</p>
        </div>
      )}
      
      <div ref={containerRef} className="w-full flex justify-center" />
      
      {isReady && showMask && (
        <div className="ad-mask transition-opacity duration-1000 ease-in-out">
           <div className="bg-white/90 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
             <span className="text-[9px] font-black text-gray-400">إعلان محمي بواسطة AdGuard</span>
           </div>
        </div>
      )}
    </div>
  );
};
