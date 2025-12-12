
import React, { useState } from 'react';
import { Product } from '../types';
import { Icons } from './Icons';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onBuy: (product: Product) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onBuy }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  // 行銷用高調標籤
  const renderBadge = (text: string) => {
      if (text.includes('熱銷')) {
          return (
            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transform hover:scale-105 transition-transform">
                <Icons.Flame size={14} fill="currentColor" />
                {text}
            </span>
          );
      }
      if (text.includes('限定')) {
          return (
            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transform hover:scale-105 transition-transform">
                <Icons.Gift size={14} />
                {text}
            </span>
          );
      }
      return (
        <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
            {text}
        </span>
      );
  };

  // 功能性低調分類標籤
  const renderCategoryBadge = () => {
      const isStore = product.category === 'store';
      return (
          <div className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-md
              ${isStore 
                ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' 
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }
          `}>
              {isStore ? <Icons.Store size={14} /> : <Icons.Truck size={14} />}
              <span>{isStore ? '超商取貨含運' : '黑貓低溫宅配'}</span>
          </div>
      );
  };

  return (
    // Mobile: fixed inset-0 with white background (no backdrop). Desktop: backdrop-blur with padding.
    <div className="fixed inset-0 z-50 flex items-center justify-center md:bg-slate-900/60 md:backdrop-blur-sm md:p-4 animate-fade-in">
      
      {/* Container: Fullscreen on mobile, rounded card on desktop */}
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Close Button (Mobile & Desktop) */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <Icons.Close size={20} />
        </button>

        {/* Image Gallery Section - Mobile: 40% height, Desktop: 60% width */}
        <div className="w-full h-[40%] md:h-auto md:w-3/5 bg-slate-100 dark:bg-slate-950 relative flex flex-col justify-center group flex-shrink-0">
          <div className="relative w-full h-full">
            <img 
              src={product.images[currentImageIndex]} 
              alt={`${product.title} view ${currentImageIndex + 1}`} 
              className="w-full h-full object-cover"
            />

            {/* Mobile Overlay Badges (Hidden on Desktop) */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start md:hidden">
              {product.badge && renderBadge(product.badge)}
              {renderCategoryBadge()}
            </div>

            {/* Navigation Arrows */}
            <button 
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100" // Always visible on mobile if needed, or stick to group hover
            >
              <Icons.ArrowRight className="rotate-180" size={24} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100"
            >
              <Icons.ArrowRight size={24} />
            </button>
          </div>
          
          {/* Thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2 overflow-x-auto justify-center bg-gradient-to-t from-black/60 to-transparent">
            {product.images.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  idx === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info Section - Scrollable content */}
        <div className="w-full flex-1 md:w-2/5 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
           <div className="p-6 flex-1 overflow-y-auto">
             {/* Desktop Badges (Hidden on Mobile) */}
             {/* Change: justify-start instead of justify-between to keep badges on the left away from close button */}
             <div className="hidden md:flex justify-start items-center mb-4 gap-2 flex-wrap">
                {product.badge && renderBadge(product.badge)}
                {renderCategoryBadge()}
             </div>
             
             {/* Mobile Spacer (Optional, if we want to push title down slightly or just rely on padding-top) */}
             {/* We rely on p-6, which is sufficient space */}

             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{product.title}</h2>
             <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6">${product.price}</p>
             
             <div className="space-y-6">
               <div>
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                   <Icons.Product size={16} /> 產品特色
                 </h3>
                 <ul className="space-y-2">
                    {product.description.map((item, idx) => (
                      <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                 </ul>
               </div>

               {product.longDescription && (
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Icons.Brand size={16} /> 商品介紹
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {product.longDescription}
                    </p>
                 </div>
               )}
             </div>
           </div>

           {/* Footer Action */}
           <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 pb-safe">
             <button 
                onClick={() => onBuy(product)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Icons.Lightning size={20} fill="currentColor" />
                立即購買
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetailModal;
