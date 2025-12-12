import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Icons } from './Icons';
import { editProductImage } from '../services/geminiService';

interface AIEditorModalProps {
  product: Product;
  onClose: () => void;
}

const AIEditorModal: React.FC<AIEditorModalProps> = ({ product, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Scroll Lock Effect ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = '';
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Use the first image from the array
      const response = await fetch(product.images[0]);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const result = await editProductImage(base64, prompt);
          setGeneratedImage(result);
        } catch (e) {
          setError('AI 編輯失敗，請稍後再試。');
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (e) {
      setError('載入圖片失敗');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-300">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Icons.Magic className="text-purple-600 dark:text-purple-400" size={20} />
            AI 料理預覽實驗室
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Icons.Close size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            想知道這份海鮮煮熟後是什麼樣子嗎？或者想看它擺在高級餐盤上？
            輸入指令，讓 AI 幫你預覽！
          </p>

          <div className="aspect-square w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-4 relative">
             {isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                 <div className="text-center">
                    <Icons.Loading className="animate-spin text-purple-600 mx-auto mb-2" size={32} />
                    <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">AI 正在施法中...</span>
                 </div>
               </div>
             ) : generatedImage ? (
               <img src={generatedImage} alt="AI Generated" className="w-full h-full object-cover" />
             ) : (
               <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
             )}
          </div>

          <div className="space-y-3">
             <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">你的指令</label>
             <div className="flex gap-2">
               <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：煮成紅燒口味、加點檸檬片..."
                  className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400"
               />
               <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="bg-purple-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
               >
                 <Icons.Magic size={20} />
               </button>
             </div>
             {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          
          <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">試試看這些指令：</h4>
            <div className="flex flex-wrap gap-2">
              {['變成熟食', '擺盤在高級瓷盤上', '加上大蒜和辣椒', '變成油炸料理'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setPrompt(tag)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEditorModal;
