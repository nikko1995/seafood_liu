
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Icons } from './Icons';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onBuy: (product: Product) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onBuy }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- Scroll Lock Effect ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = '';
    };
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const renderBadge = (text: string) => {
      if (text.includes('熱銷')) {
          return (
            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 transform hover:scale-105 transition-transform">
                <Icons.Flame size={12} fill="currentColor" />
                {text}
            </span>
          );
      }
      if (text.includes('限定')) {
          return (
            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 transform hover:scale-105 transition-transform">
                <Icons.Gift size={12} />
                {text}
            </span>
          );
      }
      return (
        <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
            {text}
        </span>
      );
  };

  const renderCategoryBadge = () => {
      const isStore = product.category === 'store';
      return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
              {isStore ? <Icons.Store size={12} /> : <Icons.Truck size={12} />}
              <span>{isStore ? '超取含運' : '低溫宅配'}</span>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:bg-slate-900/60 md:backdrop-blur-sm md:p-4 animate-fade-in">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[85vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-30 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <Icons.Close size={20} />
        </button>

        {/* Image Section - Fixed 1:1 Aspect Ratio Container */}
        <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-950 relative flex flex-col group flex-shrink-0">
          <div className="relative aspect-square w-full overflow-hidden">
            <img 
              src={product.images[currentImageIndex]} 
              alt={product.title} 
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
              {product.badge && renderBadge(product.badge)}
              {renderCategoryBadge()}
            </div>

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <Icons.ArrowRight className="rotate-180" size={20} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <Icons.ArrowRight size={20} />
                </button>
              </>
            )}
            
            {/* Thumbnails Overlay */}
            <div className="absolute bottom-3 left-0 right-0 px-3 flex gap-2 overflow-x-auto justify-center scrollbar-hide">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 shadow-lg ${
                    idx === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full flex-1 md:w-1/2 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
           <div className="p-6 md:p-8 flex-1 overflow-y-auto">
             <div className="mb-1 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase">Premium Seafood</div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{product.title}</h2>
             <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-black text-slate-900 dark:text-white">${product.price}</span>
                <span className="text-xs text-slate-400 font-medium">TWD / 盒</span>
             </div>
             
             <div className="space-y-6">
               <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   產品特色 Highlights
                 </h3>
                 <ul className="space-y-2.5">
                    {product.description.map((item, idx) => (
                      <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <Icons.Check className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" size={14} strokeWidth={3} />
                        {item}
                      </li>
                    ))}
                 </ul>
               </div>

               {product.longDescription && (
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      商品介紹 Description
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {product.longDescription}
                    </p>
                 </div>
               )}
             </div>
           </div>

           {/* Footer Action */}
           <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe">
             <button 
                onClick={() => onBuy(product)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Icons.Lightning size={20} fill="currentColor" />
                立即訂購這組禮盒
             </button>
             <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">訂單送出後將有專人為您核對配送資訊</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
