
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
  const isPushedRef = useRef(false);
  
  const config = PLACEMENT_CONFIGS[placementId] || { minHeight: '100px' };

  // 1. مزامنة حالة الأمان العالمية
  useEffect(() => {
    const unsubscribe = adGuard.subscribeToSafety((safe) => {
      setIsSafe(safe);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الإعدادات (مرة واحدة)
  useEffect(() => {
    adGuard.getSettings().then(setSettings);
  }, []);

  // 3. بناء عنصر الـ INS بمجرد توفر الإعدادات (لضمان وجوده في الـ DOM فوراً للزواحف)
  useEffect(() => {
    if (!settings || !containerRef.current) return;
    
    const placement = settings.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) {
      containerRef.current.innerHTML = '';
      return;
    }

    // استخراج الخصائص الأساسية عبر Regex (أكثر أماناً من DOMParser وأسرع)
    const clientMatch = placement.code.match(/data-ad-client="([^"]+)"/);
    const slotMatch = placement.code.match(/data-ad-slot="([^"]+)"/);
    const formatMatch = placement.code.match(/data-ad-format="([^"]+)"/);
    
    const adClient = clientMatch ? clientMatch[1] : settings.adClient;
    const adSlot = slotMatch ? slotMatch[1] : '';
    const adFormat = formatMatch ? formatMatch[1] : 'auto';

    if (!adSlot) {
      // إذا لم يكن كود أدسنس قياسي (مثلاً سكريبت خارجي)، نحقنه مباشرة
      containerRef.current.innerHTML = placement.code;
      return;
    }

    // بناء الـ INS القياسي
    containerRef.current.innerHTML = `
      <ins class="adsbygoogle"
           style="display:block; min-height:${config.minHeight};"
           data-ad-client="${adClient}"
           data-ad-slot="${adSlot}"
           data-ad-format="${adFormat}"
           data-full-width-responsive="true"></ins>
    `;
    
    // إعادة ضبط حالة الـ Push عند تغيير المحتوى أو المسار
    isPushedRef.current = false;
  }, [settings, placementId, currentPath]);

  // 4. تفعيل الإعلان (Push) فقط عندما تصبح الحالة Safe
  useEffect(() => {
    if (isSafe && !isPushedRef.current && containerRef.current) {
      const ins = containerRef.current.querySelector('ins.adsbygoogle');
      if (ins) {
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
          isPushedRef.current = true;
        } catch (e) {
          console.warn(`AdSense Push Failed [${placementId}]:`, e);
        }
      }
    }
  }, [isSafe, settings, currentPath]);

  return (
    <div 
      className="ads-container-fixed mx-auto my-8 bg-transparent transition-opacity duration-700"
      style={{ 
        width: '100%',
        minHeight: config.minHeight,
        opacity: isSafe ? 1 : 0.05 // إبقاء شفافية خفيفة جداً بدلاً من الإخفاء الكامل لتحسين ثقة جوجل
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center overflow-hidden"
      />
    </div>
  );
};
