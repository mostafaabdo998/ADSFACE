
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string;
}

// تعريف الأحجام القياسية لكل موضع لضمان قبول أدسنس
const PLACEMENT_CONFIGS: Record<string, { minHeight: string, width: string }> = {
  'pos_top': { minHeight: '90px', width: '100%' },
  'pos_after_title': { minHeight: '250px', width: '100%' },
  'pos_mid_1': { minHeight: '280px', width: '100%' },
  'pos_mid_2': { minHeight: '280px', width: '100%' },
  'pos_bottom': { minHeight: '250px', width: '100%' },
  'pos_sidebar_main': { minHeight: '600px', width: '100%' }
};

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, currentPath }) => {
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInjectedRef = useRef(false);
  
  const config = PLACEMENT_CONFIGS[placementId] || { minHeight: '100px', width: '100%' };

  // تصفير عند تغيير المسار
  useEffect(() => {
    setIsSafe(false);
    isInjectedRef.current = false;
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, [currentPath]);

  // جلب الإعدادات
  useEffect(() => {
    adGuard.getSettings().then(data => {
      if (data) setSettings(data);
    });
  }, []);

  // محرك الأمان
  useEffect(() => {
    if (!settings || isSafe) return;

    const safetyInterval = setInterval(async () => {
      const safe = await adGuard.checkSafety(settings);
      if (safe) {
        setIsSafe(true);
        if (settings.adClient) adGuard.injectAdSense(settings.adClient);
        clearInterval(safetyInterval);
      }
    }, 500);

    return () => clearInterval(safetyInterval);
  }, [settings, isSafe]);

  // الحقن التقني
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current && containerRef.current) {
      // حقن فوري بدون تأخير طويل لضمان استقرار الـ DOM
      handleStaticInjection();
    }
  }, [isSafe, settings]);

  const handleStaticInjection = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    isInjectedRef.current = true;
    const container = containerRef.current;
    
    // استخراج الخصائص من كود أدسنس
    const parser = new DOMParser();
    const doc = parser.parseFromString(placement.code, 'text/html');
    const originalIns = doc.querySelector('ins.adsbygoogle');

    if (originalIns) {
      const newIns = document.createElement('ins');
      newIns.className = 'adsbygoogle';
      
      // نقل الخصائص
      Array.from(originalIns.attributes).forEach(attr => {
        if (attr.name !== 'style') newIns.setAttribute(attr.name, attr.value);
      });

      // فرض الحجم الثابت برمجياً (حاسم جداً)
      newIns.style.display = 'block';
      newIns.style.width = '100%';
      newIns.style.height = config.minHeight;
      newIns.style.minHeight = config.minHeight;
      newIns.style.overflow = 'hidden';

      container.innerHTML = '';
      container.appendChild(newIns);

      // طلب الإعلان
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.error("AdSense Push Error", e);
      }
    } else {
      // إذا كان الكود ليس وسم ins (مثل سكريبت خارجي)
      container.innerHTML = placement.code;
    }
  };

  return (
    <div 
      className="ads-container-fixed mx-auto my-6"
      style={{ 
        width: config.width,
        minHeight: config.minHeight,
        visibility: isSafe ? 'visible' : 'hidden',
        opacity: isSafe ? 1 : 0,
        transition: 'opacity 0.5s ease-in'
      }}
    >
      <div 
        ref={containerRef} 
        style={{ width: '100%', minHeight: config.minHeight }}
      />
      {isSafe && (
        <div className="text-[7px] text-gray-300 text-center mt-1 uppercase tracking-widest opacity-50">
          Advertisement
        </div>
      )}
    </div>
  );
};
