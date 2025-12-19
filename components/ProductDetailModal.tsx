
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
            <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 transform hover:scale-105 transition-transform whitespace-nowrap">
                <Icons.Flame size={16} fill="currentColor" />
                {text}
            </span>
          );
      }
      if (text.includes('限定')) {
          return (
            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 transform hover:scale-105 transition-transform whitespace-nowrap">
                <Icons.Gift size={16} />
                {text}
            </span>
          );
      }
      return (
        <span className="bg-blue-600 text-white text-sm font-black px-4 py-2 rounded-full shadow-2xl whitespace-nowrap">
            {text}
        </span>
      );
  };

  const renderCategoryBadge = () => {
      const isStore = product.category === 'store';
      return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black border shadow-md bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 backdrop-blur-sm whitespace-nowrap">
              {isStore ? <Icons.Store size={14} /> : <Icons.Truck size={14} />}
              <span>{isStore ? '超取含運' : '低溫宅配'}</span>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:bg-slate-900/60 md:backdrop-blur-sm md:p-4 animate-fade-in">
      {/* Container - Fixed height on desktop for better layout balance */}
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-[600px] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative transition-all duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-30 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <Icons.Close size={20} />
        </button>

        {/* Image Section - Adaptive height on desktop to eliminate gaps */}
        <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-950 relative flex flex-col group flex-shrink-0 md:h-full">
          <div className="relative aspect-square md:aspect-auto w-full md:h-full overflow-hidden">
            <img 
              src={product.images[currentImageIndex]} 
              alt={product.title} 
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {/* Badges Overlay - Updated to flex-row and items-center */}
            <div className="absolute top-4 left-4 z-10 flex flex-row gap-2 items-center">
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
            
            {/* Thumbnails Overlay - Fixed to bottom of the image area */}
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
        <div className="w-full flex-1 md:w-1/2 flex flex-col bg-white dark:bg-slate-900 overflow-hidden md:h-full">
           <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
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
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                      {product.longDescription}
                    </p>
                 </div>
               )}
             </div>
           </div>

           {/* Footer Action - Fixed to the bottom of the info area */}
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
