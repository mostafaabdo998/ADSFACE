
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string;
}

const PLACEMENT_CONFIGS: Record<string, { minHeight: string }> = {
  'pos_top': { minHeight: '90px' },
  'pos_after_title': { minHeight: '280px' },
  'pos_mid_1': { minHeight: '300px' },
  'pos_mid_2': { minHeight: '300px' },
  'pos_bottom': { minHeight: '250px' },
  'pos_sidebar_main': { minHeight: '600px' }
};

export const AdSlot: React.FC<AdSlotProps> = ({ placementId, currentPath }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pushAttempted = useRef(false);
  
  const config = PLACEMENT_CONFIGS[placementId] || { minHeight: '100px' };

  useEffect(() => {
    adGuard.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    pushAttempted.current = false;

    if (!settings || !containerRef.current) return;
    
    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    
    if (!placement || !placement.isActive || !placement.code?.trim()) {
      containerRef.current.innerHTML = '';
      return;
    }

    // استخراج بيانات الإعلان
    const clientMatch = placement.code.match(/data-ad-client="([^"]+)"/);
    const slotMatch = placement.code.match(/data-ad-slot="([^"]+)"/);
    const formatMatch = placement.code.match(/data-ad-format="([^"]+)"/);
    
    const adClient = clientMatch ? clientMatch[1] : settings.adClient;
    const adSlot = slotMatch ? slotMatch[1] : '';
    const adFormat = formatMatch ? formatMatch[1] : 'auto';

    containerRef.current.innerHTML = '';

    if (!adSlot) {
      containerRef.current.innerHTML = placement.code;
      return;
    }

    // بناء وسم INS مع ضمان العرض 100%
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.width = '100%'; // تأكيد العرض الكامل
    ins.style.minHeight = config.minHeight;
    ins.style.background = 'transparent';
    ins.setAttribute('data-ad-client', adClient);
    ins.setAttribute('data-ad-slot', adSlot);
    ins.setAttribute('data-ad-format', adFormat);
    ins.setAttribute('data-full-width-responsive', 'true');

    containerRef.current.appendChild(ins);
    
    // وظيفة تنفيذ الـ push بعد التأكد من جاهزية العرض
    const tryPush = () => {
      if (pushAttempted.current) return;

      // التأكد من أن الحاوية لها عرض أكبر من 0 لتجنب خطأ TagError
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
          pushAttempted.current = true;
          console.log(`AdSense Success [${placementId}]: Width is ${containerRef.current.offsetWidth}`);
        } catch (e) {
          console.error(`AdSense Push Error [${placementId}]:`, e);
        }
      } else {
        // إذا كان العرض لا يزال 0، ننتظر الإطار التالي (Next Frame)
        requestAnimationFrame(tryPush);
      }
    };

    // نستخدم requestAnimationFrame لمنح المتصفح فرصة لحساب أبعاد الصفحة (Layout/Reflow)
    requestAnimationFrame(tryPush);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      pushAttempted.current = true; // منع أي محاولات متأخرة بعد مسح العنصر
    };

  }, [settings, placementId, currentPath]);

  return (
    <div 
      className="ads-container-fixed mx-auto my-8 bg-transparent"
      style={{ width: '100%', minHeight: config.minHeight, display: 'block', overflow: 'visible' }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center overflow-hidden"
        style={{ width: '100%' }}
      />
    </div>
  );
};
