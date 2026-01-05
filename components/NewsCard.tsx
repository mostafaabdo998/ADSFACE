
import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <div className="group bg-white rounded-3xl md:rounded-[35px] shadow-sm border border-gray-50 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
      <div className="relative overflow-hidden aspect-[16/9] md:aspect-video">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute top-4 right-4">
          <span className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-xl text-[9px] font-black text-blue-600 uppercase shadow-lg">{item.category}</span>
        </div>
      </div>
      <div className="p-6 md:p-8 text-right">
        <h3 className="text-lg md:text-xl font-black leading-tight text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p className="mt-3 text-gray-500 text-xs md:text-sm leading-relaxed line-clamp-2">
          {item.excerpt}
        </p>
        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-[9px] md:text-[10px] font-black text-gray-400 uppercase">
          <span>{item.date}</span>
          <span className="text-blue-600 group-hover:translate-x-[-4px] transition-transform">المزيد &larr;</span>
        </div>
      </div>
    </div>
  );
};
