
import React, { useEffect } from 'react';
import { NewsItem } from '../types';
import { AdSlot } from './AdSlot';

interface ArticlePageProps {
  item: NewsItem;
  onBack: () => void;
}

export const ArticlePage: React.FC<ArticlePageProps> = ({ item, onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [item.id]);

  const renderRichContent = () => {
    const paragraphs = item.content.split('</p>').filter(p => p.trim() !== '');
    if (paragraphs.length === 0) return null;
    
    const partSize = Math.ceil(paragraphs.length / 3);

    return (
      <div className="space-y-6 md:space-y-8">
        <div 
          className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: paragraphs[0] + '</p>' }} 
        />

        <AdSlot placementId="pos_after_title" />

        <div className="prose prose-sm md:prose-lg max-w-none text-gray-800 leading-[1.8] md:leading-[2] text-right font-medium">
          {/* الجزء الأول */}
          {paragraphs.slice(1, partSize).map((p, i) => (
            <div key={`p1-${i}`} className="mb-6" dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
          ))}
          
          <AdSlot placementId="pos_mid_1" />

          {/* الجزء الثاني */}
          {paragraphs.slice(partSize, partSize * 2).map((p, i) => (
            <div key={`p2-${i}`} className="mb-6" dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
          ))}

          <AdSlot placementId="pos_mid_2" />

          {/* الجزء الثالث */}
          {paragraphs.slice(partSize * 2).map((p, i) => (
            <div key={`p3-${i}`} className="mb-6" dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-black text-[10px] md:text-xs uppercase tracking-widest"
      >
        <span>&larr;</span> العودة للرئيسية
      </button>

      <article>
        <header className="mb-8 md:mb-12 text-center">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] mb-4 md:mb-6">
            {item.category}
          </span>
          <h1 className="text-2xl md:text-5xl font-black leading-tight text-gray-900 mb-6 md:mb-8">
            {item.title}
          </h1>
          <div className="flex items-center justify-center gap-4 md:gap-6 text-gray-400 text-[9px] md:text-[11px] font-black uppercase">
            <span>{item.date}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
            <span>بواسطة فريق التحرير</span>
          </div>
        </header>

        <div className="rounded-3xl md:rounded-[45px] overflow-hidden shadow-2xl mb-8 md:mb-12 border-4 md:border-[12px] border-white bg-gray-50 aspect-video md:aspect-auto">
          <img src={item.image} alt={item.title} className="w-full h-full md:max-h-[600px] object-cover" />
        </div>

        <div className="max-w-3xl mx-auto">
          {renderRichContent()}

          <AdSlot placementId="pos_bottom" />

          {item.videoEmbed && (
            <div className="video-container my-10 rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border-4 md:border-[10px] border-white aspect-video bg-black" dangerouslySetInnerHTML={{ __html: item.videoEmbed }} />
          )}

          <div className="mt-12 pt-12 border-t border-gray-100 text-center">
             <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">نهاية الخبر</p>
          </div>
        </div>
      </article>
    </div>
  );
};
