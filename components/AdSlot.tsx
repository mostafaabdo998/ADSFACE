
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

  // 1. إعادة الضبط عند تغيير المسار
  useEffect(() => {
    setIsSafe(false);
    isInjectedRef.current = false;
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

  // 3. نظام فحص الأمان (حماية فيسبوك)
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

  // 4. عملية الحقن الآمنة
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current) {
      // ننتظر حتى تكتمل عملية الـ DOM Update وتظهر الحاوية
      const timer = setTimeout(() => {
        handleAdRender();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSafe, settings, currentPath]);

  const handleAdRender = () => {
    const currentContainer = containerRef.current;
    if (!currentContainer || isInjectedRef.current) return;

    // التحقق من وجود عرض متاح (حل مشكلة availableWidth=0)
    if (currentContainer.offsetWidth <= 0) {
      // إذا لم يظهر العرض بعد، نحاول مرة أخرى في الفريم القادم
      requestAnimationFrame(handleAdRender);
      return;
    }

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    // منع الحقن المزدوج
    isInjectedRef.current = true;
    currentContainer.innerHTML = ''; 

    // إنشاء حاوية فرعية
    const adWrapper = document.createElement('div');
    adWrapper.className = "adsense-wrapper w-full flex justify-center overflow-hidden";
    adWrapper.innerHTML = placement.code;
    currentContainer.appendChild(adWrapper);

    // التحقق من وجود عنصر ins قبل عمل push
    const insTag = adWrapper.querySelector('ins.adsbygoogle');
    if (insTag && !insTag.hasAttribute('data-adsbygoogle-status')) {
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.error("AdSense Push Error for:", placementId, e);
        // في حال الخطأ، نعيد المحاولة لاحقاً
        isInjectedRef.current = false;
      }
    }
  };

  return (
    <div 
      className={`ad-slot-container w-full flex justify-center transition-all duration-500 ${
        isSafe ? 'opacity-100 py-4 min-h-[100px]' : 'opacity-0 h-0 overflow-hidden'
      }`}
      style={{ display: isSafe ? 'flex' : 'none' }} // استخدام display block/flex لضمان حساب العرض
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center" 
        style={{ minWidth: '100%' }}
      />
    </div>
  );
};
