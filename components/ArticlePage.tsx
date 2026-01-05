
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
    const midPoint = Math.ceil(paragraphs.length / 2);

    return (
      <div className="space-y-6 md:space-y-8 px-1">
        <div 
          className="text-lg md:text-2xl font-bold text-gray-900 leading-relaxed mb-4 md:mb-6"
          dangerouslySetInnerHTML={{ __html: paragraphs[0] + '</p>' }} 
        />

        <AdSlot key={`ad-p1-${item.id}`} placementId="pos1" format="horizontal" />

        <div className="prose prose-sm md:prose-lg max-w-none text-gray-800 leading-[1.8] md:leading-[1.9] font-medium text-base md:text-lg text-right">
          {paragraphs.slice(1, midPoint).map((p, i) => (
            <div key={`p-chunk1-${i}`} className="mb-6" dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
          ))}
          
          <AdSlot key={`ad-mid-${item.id}`} placementId="pos2" format="rectangle" />

          {paragraphs.slice(midPoint).map((p, i) => (
            <div key={`p-chunk2-${i}`} className="mb-6" dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <button 
        onClick={onBack}
        className="mb-6 md:mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest"
      >
        <span>&larr;</span> العودة للرئيسية
      </button>

      <article>
        <header className="mb-8 md:mb-10 text-center">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-4 md:mb-6">
            {item.category}
          </span>
          <h1 className="text-2xl md:text-5xl font-black leading-tight text-gray-900 mb-6 md:mb-8 px-2 md:px-4">
            {item.title}
          </h1>
          <div className="flex items-center justify-center gap-4 md:gap-6 text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-tighter">
            <span>{item.date}</span>
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-200 rounded-full"></span>
            <span>بواسطة فريق التحرير</span>
          </div>
        </header>

        <div className="rounded-3xl md:rounded-[40px] overflow-hidden shadow-xl mb-8 md:mb-12 border-4 md:border-[12px] border-white bg-gray-50">
          <img src={item.image} alt={item.title} className="w-full min-h-[200px] max-h-[500px] object-cover" />
        </div>

        <div className="max-w-3xl mx-auto">
          {renderRichContent()}

          <AdSlot key={`ad-bottom-${item.id}`} placementId="pos3" format="auto" />

          {item.videoEmbed && (
            <div className="video-container my-8 md:my-12 rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border-4 md:border-[10px] border-white aspect-video bg-black" dangerouslySetInnerHTML={{ __html: item.videoEmbed }} />
          )}

          <blockquote className="border-r-[6px] md:border-r-[10px] border-blue-600 bg-blue-50/40 p-6 md:p-12 my-8 md:my-12 rounded-3xl md:rounded-[40px] italic font-black text-lg md:text-2xl text-blue-900 shadow-inner">
            "نحن نلتزم بتقديم الخبر بمهنية عالية ومصداقية تامة في جميع منصاتنا الرقمية."
          </blockquote>
        </div>
      </article>
    </div>
  );
};
