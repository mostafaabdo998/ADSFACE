
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
  }, [item.id]); // التمرير للأعلى عند تغيير المقال

  const renderRichContent = () => {
    const paragraphs = item.content.split('</p>').filter(p => p.trim() !== '');
    
    if (paragraphs.length === 0) return null;

    return (
      <div className="space-y-8">
        <div 
          className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: paragraphs[0] + '</p>' }} 
        />

        {/* الحل 1: استخدام key={item.id + '...'} يجبر React على إعادة إنشاء المكون بالكامل */}
        <div className="py-4 border-y border-gray-50">
           <AdSlot key={`ad-p1-${item.id}`} placementId="pos2" format="auto" />
        </div>

        {paragraphs.length > 1 && (
          <div className="prose prose-lg prose-blue max-w-none text-gray-800 leading-[1.9] font-medium text-lg text-right">
            {paragraphs.slice(1, Math.ceil(paragraphs.length / 2)).map((p, i) => (
              <div key={`p1-${i}`} dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
            ))}
            
            <div className="my-10">
               <AdSlot key={`ad-mid-${item.id}`} placementId="pos3" format="rectangle" />
            </div>

            {paragraphs.slice(Math.ceil(paragraphs.length / 2)).map((p, i) => (
              <div key={`p2-${i}`} dangerouslySetInnerHTML={{ __html: p + '</p>' }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-black text-xs uppercase tracking-widest"
      >
        <span>&larr;</span> العودة للرئيسية
      </button>

      <article>
        <header className="mb-10 text-center">
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

        <div className="mb-10">
          <AdSlot key={`ad-top-${item.id}`} placementId="pos1" format="horizontal" />
        </div>

        <div className="rounded-[40px] overflow-hidden shadow-2xl mb-12 border-[12px] border-white bg-gray-50">
          <img src={item.image} alt={item.title} className="w-full min-h-[300px] max-h-[600px] object-cover" />
        </div>

        <div className="max-w-3xl mx-auto">
          {renderRichContent()}

          {item.videoEmbed && (
            <div className="video-container my-12 rounded-[40px] overflow-hidden shadow-2xl border-[10px] border-white aspect-video bg-black" dangerouslySetInnerHTML={{ __html: item.videoEmbed }} />
          )}

          <blockquote className="border-r-[10px] border-blue-600 bg-blue-50/40 p-12 my-12 rounded-[40px] italic font-black text-2xl text-blue-900 shadow-inner">
            "نحن نلتزم بتقديم الخبر بمهنية عالية ومصداقية تامة في جميع منصاتنا الرقمية."
          </blockquote>
        </div>
      </article>
    </div>
  );
};
