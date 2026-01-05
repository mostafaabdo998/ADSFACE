
import React, { useEffect } from 'react';
import { NewsItem } from '../types';
import { AdSlot } from './AdSlot';

interface ArticlePageProps {
  item: NewsItem;
  onBack: () => void;
}

export const ArticlePage: React.FC<ArticlePageProps> = ({ item, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-black text-xs uppercase tracking-widest"
      >
        <span>&larr;</span> العودة للرئيسية
      </button>

      <article>
        <header className="mb-12 text-center">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-black uppercase tracking-widest text-[9px] mb-6">
            {item.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-black leading-tight text-gray-900 mb-8 px-4">
            {item.title}
          </h1>
          <div className="flex items-center justify-center gap-6 text-gray-400 text-[10px] font-black uppercase tracking-tighter">
            <span>{item.date}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
            <span>بواسطة فريق التحرير</span>
          </div>
        </header>

        {/* Dynamic Ad Placement 1: Top */}
        <div className="ad-section-top">
          <AdSlot placementId="pos1" format="horizontal" />
        </div>

        <div className="rounded-[40px] overflow-hidden shadow-2xl mb-12 border-[12px] border-white bg-gray-50">
          <img src={item.image} alt={item.title} className="w-full min-h-[300px] max-h-[600px] object-cover" />
        </div>

        <div className="max-w-3xl mx-auto">
          <p className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed border-r-8 border-blue-600 pr-8 py-4 mb-12 bg-blue-50/30 rounded-l-[32px]">
            {item.excerpt}
          </p>
          
          <div 
            className="article-content prose prose-lg prose-blue max-w-none text-gray-800 leading-[1.9] space-y-8 font-medium text-lg text-right"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          {/* Dynamic Ad Placement 2: Middle */}
          <div className="ad-section-middle py-8">
            <AdSlot placementId="pos2" format="rectangle" />
          </div>

          {/* VIDEO EMBED */}
          {item.videoEmbed && (
            <div className="video-container my-12 rounded-[40px] overflow-hidden shadow-2xl border-[10px] border-white aspect-video bg-black" dangerouslySetInnerHTML={{ __html: item.videoEmbed }} />
          )}

          <blockquote className="border-r-[10px] border-blue-600 bg-blue-50/40 p-12 my-12 rounded-[40px] italic font-black text-2xl text-blue-900 shadow-inner">
            "نحن نلتزم بتقديم الخبر بمهنية عالية ومصداقية تامة في جميع منصاتنا الرقمية."
          </blockquote>

          {/* Dynamic Ad Placement 3: Bottom */}
          <div className="ad-section-bottom pt-8">
            <AdSlot placementId="pos3" format="auto" />
          </div>
        </div>
      </article>
    </div>
  );
};
