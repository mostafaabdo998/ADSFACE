
import React from 'react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">{item.category}</span>
        <h3 className="mt-2 text-xl font-bold leading-tight hover:text-blue-700 cursor-pointer">
          {item.title}
        </h3>
        <p className="mt-2 text-gray-600 text-sm line-clamp-2">
          {item.excerpt}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>{item.date}</span>
          <button className="text-blue-600 font-bold hover:underline">اقرأ المزيد</button>
        </div>
      </div>
    </div>
  );
};
