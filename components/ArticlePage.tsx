
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
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-bold text-sm"
      >
        <span>&rarr;</span> العودة للرئيسية
      </button>

      <article>
        <header className="mb-10 text-center">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-black uppercase tracking-widest text-[10px] mb-4">
            {item.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight text-gray-900 mb-6">
            {item.title}
          </h1>
          <div className="flex items-center justify-center gap-6 text-gray-400 text-xs font-bold">
            <span>{item.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1">قراءة في 3 دقائق</span>
          </div>
        </header>

        {/* Dynamic Ad Placement 1: Top */}
        <AdSlot placementId="pos1" format="horizontal" />

        <div className="rounded-[40px] overflow-hidden shadow-2xl mb-12 border-8 border-white bg-gray-100">
          <img src={item.image} alt={item.title} className="w-full min-h-[400px] max-h-[600px] object-cover" />
        </div>

        <div className="prose prose-lg max-w-none text-gray-800 leading-[1.8] space-y-8 font-serif">
          <p className="text-2xl font-bold text-gray-900 leading-relaxed border-r-4 border-blue-600 pr-8 py-2 mb-12 bg-blue-50/20 rounded-l-2xl">
            {item.excerpt}
          </p>
          
          {/* HTML CONTENT RENDERING */}
          <div 
            className="article-content whitespace-pre-wrap text-lg"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          {/* VIDEO EMBED */}
          {item.videoEmbed && (
            <div className="video-container my-12 rounded-[32px] overflow-hidden shadow-lg border-4 border-white aspect-video" dangerouslySetInnerHTML={{ __html: item.videoEmbed }} />
          )}

          {/* Dynamic Ad Placement 2: Middle */}
          <AdSlot placementId="pos2" format="rectangle" />

          <blockquote className="border-r-8 border-blue-600 bg-blue-50/50 p-10 my-12 rounded-3xl italic font-bold text-2xl text-blue-900 shadow-sm">
            "نحن نلتزم بتقديم الخبر بمهنية عالية ومصداقية تامة في جميع منصاتنا الرقمية."
          </blockquote>

          {/* Dynamic Ad Placement 3: Bottom */}
          <AdSlot placementId="pos3" format="auto" />
        </div>
      </article>
    </div>
  );
};
