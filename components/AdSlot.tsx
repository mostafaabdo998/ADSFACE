
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

  // 1. تصفير الحالة عند تغيير الصفحة
  useEffect(() => {
    setIsSafe(false);
    isInjectedRef.current = false;
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, [currentPath]);

  // 2. جلب الإعدادات
  useEffect(() => {
    adGuard.getSettings().then(data => {
      if (data) setSettings(data);
    });
  }, []);

  // 3. محرك فحص الأمان
  useEffect(() => {
    if (!settings || isSafe) return;

    const safetyInterval = setInterval(async () => {
      const safe = await adGuard.checkSafety(settings);
      if (safe) {
        setIsSafe(true);
        if (settings.adClient) adGuard.injectAdSense(settings.adClient);
        clearInterval(safetyInterval);
      }
    }, 600);

    return () => clearInterval(safetyInterval);
  }, [settings, isSafe]);

  // 4. عملية الحقن الاحترافية
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current && containerRef.current) {
      // ننتظر قليلاً حتى ينتهي الـ CSS Transition ويصبح العنصر مرئياً بوضوح
      const timer = setTimeout(() => {
        handleExpertInjection();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSafe, settings]);

  const handleExpertInjection = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    isInjectedRef.current = true;
    
    // إنشاء حاوية نظيفة
    const container = containerRef.current;
    container.innerHTML = '';

    // تحليل الكود لاستخراج الـ attributes من وسم ins
    // نستخدم DOMParser لتجنب مشاكل الـ innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(placement.code, 'text/html');
    const originalIns = doc.querySelector('ins.adsbygoogle');

    if (!originalIns) {
      // إذا لم يجد وسم ins، نقوم بحقن الكود كما هو كملاذ أخير
      container.innerHTML = placement.code;
    } else {
      // بناء وسم ins جديد برمجياً لضمان تنفيذ نظيف
      const newIns = document.createElement('ins');
      newIns.className = 'adsbygoogle';
      
      // نقل كافة الخصائص (data-ad-client, data-ad-slot, etc)
      Array.from(originalIns.attributes).forEach(attr => {
        newIns.setAttribute(attr.name, attr.value);
      });

      // إجبار التنسيق ليكون مرئياً
      newIns.style.display = 'block';
      newIns.style.minHeight = '100px';
      newIns.style.width = '100%';

      container.appendChild(newIns);
    }

    // الخطوة الحاسمة: استدعاء محرك جوجل
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.warn("AdSense Engine Busy - Retrying...");
      setTimeout(() => {
        try { (window as any).adsbygoogle.push({}); } catch(i) {}
      }, 1000);
    }
  };

  return (
    <div 
      className="ad-slot-wrapper w-full overflow-hidden transition-all duration-1000 ease-in-out"
      style={{ 
        maxHeight: isSafe ? '1000px' : '0px',
        opacity: isSafe ? 1 : 0,
        margin: isSafe ? '2rem 0' : '0'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center bg-gray-50/30 rounded-2xl"
        style={{ minHeight: isSafe ? '100px' : '0px' }}
      />
      {isSafe && (
        <div className="text-[8px] text-gray-200 text-center mt-1 uppercase tracking-widest font-bold">
          Advertisement
        </div>
      )}
    </div>
  );
};
