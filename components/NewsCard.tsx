
import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <div className="group bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-50 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
      <div className="relative overflow-hidden aspect-[16/9]">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[9px] font-black text-blue-600 uppercase shadow-sm">{item.category}</span>
        </div>
      </div>
      <div className="p-4 md:p-6 text-right">
        <h3 className="text-base md:text-lg font-black leading-tight text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p className="mt-2 text-gray-500 text-xs leading-relaxed line-clamp-2">
          {item.excerpt}
        </p>
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-tighter">
          <span>{item.date}</span>
          <span className="text-blue-600">المزيد &larr;</span>
        </div>
      </div>
    </div>
  );
};
