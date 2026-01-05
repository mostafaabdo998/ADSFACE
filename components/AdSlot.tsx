
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

  // 1. إعادة الضبط عند تغيير المسار
  useEffect(() => {
    setIsSafe(false);
    isInjectedRef.current = false;
    if (checkWidthInterval.current) window.clearInterval(checkWidthInterval.current);
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, [currentPath]);

  // 2. تحميل الإعدادات
  useEffect(() => {
    let active = true;
    adGuard.getSettings().then(data => {
      if (active && data) setSettings(data);
    });
    return () => { active = false; };
  }, []);

  // 3. صمام الأمان (حماية فيسبوك)
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
    }, 1000);

    return () => window.clearInterval(safetyInterval);
  }, [settings, isSafe, currentPath]);

  // 4. محرك الحقن (المعالج للأخطاء)
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current) {
      // نبدأ بفحص العرض دورياً حتى يصبح > 0
      checkWidthInterval.current = window.setInterval(() => {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          window.clearInterval(checkWidthInterval.current!);
          handleAdRender();
        }
      }, 100);
    }
    return () => {
      if (checkWidthInterval.current) window.clearInterval(checkWidthInterval.current);
    };
  }, [isSafe, settings, currentPath]);

  const handleAdRender = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    // قفل لمنع التكرار
    isInjectedRef.current = true;
    
    // تنظيف الحاوية
    const currentContainer = containerRef.current;
    currentContainer.innerHTML = ''; 

    // إنشاء وحدة إعلانية جديدة تماماً
    const adWrapper = document.createElement('div');
    adWrapper.id = `ad-inner-${placementId}-${Math.random().toString(36).substr(2, 5)}`;
    adWrapper.style.width = '100%';
    adWrapper.style.minHeight = '100px';
    adWrapper.style.display = 'block';
    adWrapper.innerHTML = placement.code;
    
    currentContainer.appendChild(adWrapper);

    const insTag = adWrapper.querySelector('ins.adsbygoogle');
    if (insTag) {
      try {
        // ننتظر 200ms إضافية للتأكد من أن أدسنس قرأ العرض بعد الحقن
        setTimeout(() => {
          if (!insTag.hasAttribute('data-adsbygoogle-status')) {
            (window as any).adsbygoogle = (window as any).adsbygoogle || [];
            (window as any).adsbygoogle.push({});
          }
        }, 200);
      } catch (e) {
        console.warn("AdSense Push Error (Recovering...):", placementId);
        isInjectedRef.current = false; // السماح بإعادة المحاولة في حال الفشل
      }
    }
  };

  return (
    <div 
      className={`ad-slot-boundary w-full flex justify-center transition-all duration-1000`}
      style={{ 
        // نستخدم opacity و visibility بدلاً من display none لتجنب availableWidth=0
        opacity: isSafe ? 1 : 0,
        visibility: isSafe ? 'visible' : 'hidden',
        minHeight: isSafe ? '100px' : '0px',
        height: isSafe ? 'auto' : '1px',
        overflow: 'hidden',
        margin: isSafe ? '1.5rem 0' : '0'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center overflow-hidden" 
        style={{ minWidth: '100%' }}
      />
    </div>
  );
};
