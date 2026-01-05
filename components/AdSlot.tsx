
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string;
}

// أحجام قياسية متوافقة تماماً مع أدسنس لكل موضع
const PLACEMENT_CONFIGS: Record<string, { minHeight: string, width: string, label: string }> = {
  'pos_top': { minHeight: '90px', width: '100%', label: 'Top Banner' },
  'pos_after_title': { minHeight: '280px', width: '100%', label: 'Lead Ad' },
  'pos_mid_1': { minHeight: '300px', width: '100%', label: 'In-Article 1' },
  'pos_mid_2': { minHeight: '300px', width: '100%', label: 'In-Article 2' },
  'pos_bottom': { minHeight: '250px', width: '100%', label: 'Footer Ad' },
  'pos_sidebar_main': { minHeight: '600px', width: '100%', label: 'Sidebar Tall' }
};

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, currentPath }) => {
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInjectedRef = useRef(false);
  
  const config = PLACEMENT_CONFIGS[placementId] || { minHeight: '100px', width: '100%', label: 'Ad Unit' };

  // 1. الاشتراك في حالة الأمان العالمية (بمجرد تحقق الأمان، يظهر الإعلان فوراً)
  useEffect(() => {
    const unsubscribe = adGuard.subscribeToSafety((safe) => {
      setIsSafe(safe);
    });
    return () => { unsubscribe(); };
  }, []);

  // 2. جلب الإعدادات
  useEffect(() => {
    adGuard.getSettings().then(data => {
      if (data) setSettings(data);
    });
  }, []);

  // 3. الحقن عند تحقق الأمان وتوفر الإعدادات
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current && containerRef.current) {
      handleInjection();
    }
  }, [isSafe, settings, currentPath]);

  const handleInjection = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    isInjectedRef.current = true;
    const container = containerRef.current;
    
    // استخراج وسم INS أو حقن الكود بالكامل
    const parser = new DOMParser();
    const doc = parser.parseFromString(placement.code, 'text/html');
    const originalIns = doc.querySelector('ins.adsbygoogle');

    if (originalIns) {
      const newIns = document.createElement('ins');
      newIns.className = 'adsbygoogle';
      
      // نقل كافة الخصائص (data-ad-client, data-ad-slot, etc)
      Array.from(originalIns.attributes).forEach(attr => {
        if (attr.name !== 'style') newIns.setAttribute(attr.name, attr.value);
      });

      // فرض الأبعاد الصارمة (حجر الزاوية في ظهور الإعلانات)
      newIns.style.display = 'block';
      newIns.style.width = '100%';
      newIns.style.height = config.minHeight;
      newIns.style.minHeight = config.minHeight;
      newIns.style.textDecoration = 'none';

      container.innerHTML = '';
      container.appendChild(newIns);

      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.warn(`AdSense Push Error [${placementId}]:`, e);
      }
    } else {
      // إذا كان الكود مخصصاً (سكريبت خارجي أو صورة)
      container.innerHTML = placement.code;
    }
  };

  return (
    <div 
      className="ads-container-fixed mx-auto my-8 overflow-hidden transition-opacity duration-1000"
      style={{ 
        width: config.width,
        minHeight: config.minHeight, // حجز مساحة دائمة لمنع القفزات
        opacity: isSafe ? 1 : 0,
        visibility: isSafe ? 'visible' : 'hidden'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center"
        style={{ minHeight: config.minHeight }}
      />
      {isSafe && (
        <div className="text-[7px] text-gray-300 text-center mt-1 uppercase tracking-[0.4em] font-bold opacity-30 select-none">
          {config.label}
        </div>
      )}
    </div>
  );
};
