
import React, { useEffect, useState, useRef } from 'react';
import { adGuard } from '../services/AdGuardService';
import { SiteSettings } from '../types';

interface AdSlotProps {
  placementId: string;
  currentPath?: string;
}

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

  // 1. الاشتراك في حالة الأمان العالمية
  // Fix: Ensure the cleanup function returns void to satisfy React's Destructor type.
  // adGuard.subscribeToSafety returns a function that might return a boolean (Set.delete).
  useEffect(() => {
    const unsubscribe = adGuard.subscribeToSafety((safe) => {
      setIsSafe(safe);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 2. جلب الإعدادات وفحص الأمان المستمر
  // Fix: Move the interval cleanup out of the promise chain so it's correctly registered.
  useEffect(() => {
    let intervalId: any;
    let isMounted = true;

    adGuard.getSettings().then(data => {
      if (data && isMounted) {
        setSettings(data);
        intervalId = setInterval(() => {
          adGuard.runSafetyCheck(data);
        }, 1000);
      }
    });

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // 3. الحقن عند تحقق الأمان
  useEffect(() => {
    if (isSafe && settings && !isInjectedRef.current && containerRef.current) {
      if (settings.adClient) adGuard.injectAdSense(settings.adClient);
      
      // ننتظر قليلاً للتأكد من أن المكتبة حملت وأن الحاوية جاهزة
      const timer = setTimeout(() => {
        handleInjection();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSafe, settings, currentPath]);

  const handleInjection = () => {
    if (!containerRef.current || isInjectedRef.current) return;

    const placement = settings?.customAdPlacements?.find(p => p.id === placementId);
    if (!placement || !placement.isActive || !placement.code?.trim()) return;

    isInjectedRef.current = true;
    const container = containerRef.current;
    
    // محاولة ذكية لاستخراج الـ INS أو استخدام الكود الخام
    const parser = new DOMParser();
    const doc = parser.parseFromString(placement.code, 'text/html');
    const originalIns = doc.querySelector('ins.adsbygoogle');

    if (originalIns) {
      const newIns = document.createElement('ins');
      newIns.className = 'adsbygoogle';
      
      Array.from(originalIns.attributes).forEach(attr => {
        if (attr.name !== 'style') newIns.setAttribute(attr.name, attr.value);
      });

      // فرض الأبعاد لضمان قبول أدسنس
      newIns.style.display = 'block';
      newIns.style.width = '100%';
      newIns.style.height = config.minHeight;
      newIns.style.minHeight = config.minHeight;

      container.innerHTML = '';
      container.appendChild(newIns);

      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.warn("AdSense push failed for slot:", placementId);
      }
    } else {
      // كود غير قياسي، يتم حقنه مباشرة
      container.innerHTML = placement.code;
      // محاولة استدعاء push إذا كان هناك وسم adsbygoogle تم حقنه للتو
      setTimeout(() => {
        try { (window as any).adsbygoogle.push({}); } catch(e) {}
      }, 500);
    }
  };

  return (
    <div 
      className="ads-container-fixed mx-auto my-8 overflow-hidden transition-all duration-700"
      style={{ 
        width: config.width,
        minHeight: isSafe ? config.minHeight : '0px',
        opacity: isSafe ? 1 : 0,
        marginBottom: isSafe ? '2rem' : '0'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full flex justify-center items-center"
        style={{ minHeight: isSafe ? config.minHeight : '0px' }}
      />
      {isSafe && (
        <div className="text-[7px] text-gray-300 text-center mt-1 uppercase tracking-[0.3em] font-bold opacity-40">
          Advertisement
        </div>
      )}
    </div>
  );
};
