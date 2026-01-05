
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
  const [isSafe, setIsSafe] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPushed = useRef(false);
  
  const config = PLACEMENT_CONFIGS[placementId] || { minHeight: '100px' };

  // 1. مزامنة حالة الأمان
  useEffect(() => {
    return adGuard.subscribeToSafety(setIsSafe);
  }, []);

  // 2. جلب الإعدادات
  useEffect(() => {
    adGuard.getSettings().then(setSettings);
  }, []);

  // 3. بناء الـ INS بمجرد توفر الإعدادات (ثابت دائماً في الـ DOM)
  useEffect(() => {
    if (!settings || !containerRef.current) return;
    
    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) {
      containerRef.current.innerHTML = '';
      return;
    }

    // استخراج الخصائص بأمان (Regex)
    const clientMatch = placement.code.match(/data-ad-client="([^"]+)"/);
    const slotMatch = placement.code.match(/data-ad-slot="([^"]+)"/);
    const formatMatch = placement.code.match(/data-ad-format="([^"]+)"/);
    
    const adClient = clientMatch ? clientMatch[1] : settings.adClient;
    const adSlot = slotMatch ? slotMatch[1] : '';
    const adFormat = formatMatch ? formatMatch[1] : 'auto';

    if (!adSlot) {
      // كود غير قياسي (مثلاً سكريبت خارجي أو بنر صورة)
      containerRef.current.innerHTML = placement.code;
      return;
    }

    // حقن وسم INS نظيف وقانوني
    // ملاحظة: لا نستخدم opacity:0 بل نتركه كما هو، أدسنس سيتعامل معه كـ Unfilled حتى يتم استدعاء push
    containerRef.current.innerHTML = `
      <ins class="adsbygoogle"
           style="display:block; min-height:${config.minHeight}; background: transparent;"
           data-ad-client="${adClient}"
           data-ad-slot="${adSlot}"
           data-ad-format="${adFormat}"
           data-full-width-responsive="true"></ins>
    `;
    
    isPushed.current = false;
  }, [settings, placementId, currentPath]);

  // 4. تفعيل الإعلان (The Push)
  useEffect(() => {
    if (isSafe && !isPushed.current && containerRef.current) {
      const ins = containerRef.current.querySelector('ins.adsbygoogle');
      if (ins) {
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
          isPushed.current = true;
        } catch (e) {
          console.error(`AdSense Push Error [${placementId}]:`, e);
        }
      }
    }
  }, [isSafe, settings, currentPath]);

  return (
    <div 
      className="ads-container-fixed mx-auto my-8 bg-transparent"
      style={{ width: '100%', minHeight: config.minHeight }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center overflow-hidden"
      />
    </div>
  );
};
