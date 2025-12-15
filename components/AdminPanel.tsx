
import React, { useState, useEffect } from 'react';
import { Product, Order, SiteSettings } from '../types';
import { Icons } from './Icons';
import { saveProduct, removeProduct, updateOrderStatus, saveSettings, deleteAllOrders } from '../services/firebaseService';
import { sendTelegramNotification } from '../services/telegramService';

interface AdminPanelProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onLogout: () => void;
}

// Extended Tab Type for Admin Panel Internal Navigation
type AdminTab = 'products' | 'brand' | 'appearance' | 'orders' | 'settings';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, setProducts, orders, setOrders, settings, setSettings, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isSaving, setIsSaving] = useState(false);
  
  // --- Product Management State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Order Management State ---
  const [sortConfig, setSortConfig] = useState<{ key: 'customer' | 'date' | 'id', direction: 'asc' | 'desc' } | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDateRange, setOrderDateRange] = useState({ start: '', end: '' });
  const [filterShippingType, setFilterShippingType] = useState<'all' | 'store' | 'delivery'>('all');
  const [orderPage, setOrderPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Reset page when filters change
  useEffect(() => {
    setOrderPage(1);
  }, [orderSearchTerm, orderDateRange, filterShippingType]);

  // Lock body scroll when edit modal is open
  useEffect(() => {
      if (isEditModalOpen) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
  }, [isEditModalOpen]);

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      title: '新海鮮商品',
      price: 1000,
      description: ['特色1', '特色2'],
      images: ['https://images.unsplash.com/photo-1534483509719-3feaee7c30da?q=80&w=600&auto=format&fit=crop'],
      longDescription: '',
      isActive: true,
      category: 'store', // Default
      badge: '' 
    };
    setEditingProduct(newProduct);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
        await saveProduct(editingProduct);
        setProducts(prev => {
            const exists = prev.find(p => p.id === editingProduct.id);
            if (exists) {
                return prev.map(p => p.id === editingProduct.id ? editingProduct : p);
            }
            return [...prev, editingProduct];
        });
        setIsEditModalOpen(false);
        setEditingProduct(null);
    } catch (e) {
        alert("儲存失敗，請檢查權限是否正確");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('確定要刪除此商品嗎？')) {
      try {
          await removeProduct(id);
          setProducts(prev => prev.filter(p => p.id !== id));
      } catch (e) {
          alert("刪除失敗");
      }
    }
  };

  // --- Image Handling (Product Modal) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !editingProduct) return;
      const remainingSlots = 6 - editingProduct.images.length;
      if (remainingSlots <= 0) {
          alert("最多只能上傳 6 張圖片");
          return;
      }
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      filesToProcess.forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setEditingProduct(prev => {
                      if (!prev) return null;
                      return { ...prev, images: [...prev.images, event.target!.result as string] };
                  });
              }
          };
          // 修正：強制轉型為 Blob 以符合 TypeScript 要求
          reader.readAsDataURL(file as Blob);
      });
  };

  const handleDeleteImage = (index: number) => {
      if (!editingProduct) return;
      if (editingProduct.images.length <= 1) {
          alert("至少保留一張圖片");
          return;
      }
      const newImages = editingProduct.images.filter((_, i) => i !== index);
      setEditingProduct({...editingProduct, images: newImages});
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
      if (!editingProduct) return;
      const newImages = [...editingProduct.images];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newImages.length) {
          [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
          setEditingProduct({...editingProduct, images: newImages});
      }
  };

  // --- Order Management ---
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, lastUpdated: timestamp } : o));
    try { await updateOrderStatus(orderId, newStatus); } catch (e) { console.error(e); }
  };

  const handleDeleteAllOrders = async () => {
    if (confirm('⚠️ 嚴重警告：確定要刪除「所有」訂單資料嗎？\n\n此動作將清空資料庫中的所有訂單，且無法復原！')) {
        setIsSaving(true);
        try {
            await deleteAllOrders();
            setOrders([]);
            alert('所有訂單已成功清除。');
        } catch(e) {
            console.error(e);
            alert('清除失敗，請檢查網路或權限。');
        } finally {
            setIsSaving(false);
        }
    }
  };

  const handleSort = (key: 'customer' | 'date' | 'id') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  // Processed Orders (Filter -> Sort)
  const getProcessedOrders = () => {
      let result = [...orders];

      // 1. Search
      if (orderSearchTerm.trim()) {
          const term = orderSearchTerm.toLowerCase().trim();
          result = result.filter(o => 
              o.id.toLowerCase().includes(term) || 
              o.customerName.toLowerCase().includes(term) ||
              o.customerPhone.includes(term)
          );
      }

      // 2. Date Filter
      if (orderDateRange.start) {
          result = result.filter(o => o.date >= orderDateRange.start);
      }
      if (orderDateRange.end) {
          // Add end of day time for inclusive comparison
          result = result.filter(o => o.date <= orderDateRange.end + ' 23:59:59');
      }

      // 3. Shipping Type Filter (New)
      if (filterShippingType !== 'all') {
          result = result.filter(o => o.shippingType === filterShippingType);
      }

      // 4. Sort
      if (sortConfig) {
          result.sort((a, b) => {
              let aVal = '';
              let bVal = '';
              if (sortConfig.key === 'customer') { aVal = a.customerName; bVal = b.customerName; }
              else if (sortConfig.key === 'date') { aVal = a.date; bVal = b.date; }
              else { aVal = a.id; bVal = b.id; }
              
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      } else {
          // Default: Newest first
          result.sort((a, b) => b.date.localeCompare(a.date));
      }

      return result;
  };

  const processedOrders = getProcessedOrders();
  const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = processedOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE);

  // --- Settings Management ---
  const updateSettingsLocal = (newSettings: Partial<SiteSettings>) => {
      const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
      const updated = { ...settings, ...newSettings, lastUpdated: timestamp };
      setSettings(updated);
      saveSettings(updated).catch(e => console.error("Settings save failed", e));
  };

  const handleTestTelegram = async () => {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
          alert('請先儲存 Token 與 Chat ID');
          return;
      }
      const success = await sendTelegramNotification(settings.telegramBotToken, settings.telegramChatId, '🎉 測試訊息：您的 Telegram 通知設定成功！');
      if (success) alert('測試訊息發送成功！請檢查您的 Telegram。');
      else alert('發送失敗，請檢查 Token 與 Chat ID 是否正確。');
  };

  const inputClass = "w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  // --- Compact Image Upload Component (No Preview, Filename only) ---
  const renderImageSetting = (label: string, value: string | undefined, onUpdate: (val: string) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                 alert("圖片過大，建議 2MB 以下");
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                 if (ev.target?.result) onUpdate(ev.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg">
                <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-2 transition-colors flex-shrink-0">
                    <Icons.Upload size={14} />
                    上傳更換
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {value ? (
                        <>
                            <Icons.Check size={14} className="text-green-500 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                                {value.startsWith('data:') ? '已上傳圖片 (Base64 Data)' : value}
                            </span>
                        </>
                    ) : (
                        <>
                            <Icons.Alert size={14} className="text-slate-300 flex-shrink-0" />
                            <span className="text-xs text-slate-400 italic">未設定圖片</span>
                        </>
                    )}
                </div>

                {value && (
                    <button 
                        onClick={() => onUpdate('')}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="移除圖片"
                    >
                        <Icons.Trash size={14} />
                    </button>
                )}
            </div>
        </div>
    );
  };

  // --- Renderers ---
  // ... (Previous Renderers for Products, Brand, Appearance)

  const renderProductsTab = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">商品管理</h3>
        <button onClick={handleCreateProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Icons.Plus size={18} /> 新增商品
        </button>
      </div>
      <div className="grid gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center">
            <img src={product.images[0]} alt={product.title} className="w-20 h-20 object-cover rounded-lg" />
            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-bold text-slate-900 dark:text-white">{product.title}</h4>
              <p className="text-blue-600 dark:text-blue-400 font-bold">${product.price}</p>
              <div className="flex gap-2 justify-center sm:justify-start mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${product.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                    {product.isActive !== false ? '上架中' : '已下架'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    {product.category === 'store' ? '超取' : '宅配'}
                  </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEditProduct(product)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Icons.Edit size={20} /></button>
              <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Icons.Trash size={20} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBrandTab = () => (
    // ... existing Brand Tab content ...
    <div className="space-y-6 animate-fade-in w-full">
         <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
             <Icons.Brand className="text-orange-600" size={24} />
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">品牌介紹設定</h3>
         </div>

         {/* Banner */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="font-bold text-slate-800 dark:text-white">主視覺 Banner</h4>
             {renderImageSetting(
                 "Banner 圖片",
                 settings.brandBannerImage,
                 (val) => updateSettingsLocal({ brandBannerImage: val })
             )}
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500">Banner 標題文字</label>
                 <input 
                    type="text"
                    value={settings.brandBannerTitle || ''}
                    onChange={(e) => updateSettingsLocal({ brandBannerTitle: e.target.value })}
                    className={inputClass}
                 />
             </div>
         </div>

         {/* Features */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="font-bold text-slate-800 dark:text-white">品牌特色區塊</h4>
             {[0, 1].map((index) => (
                 <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 space-y-4">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-blue-600 dark:text-blue-400">特色 #{index + 1}</span>
                     </div>
                     
                     {/* Row 1: Icon */}
                     <div>
                         {renderImageSetting(
                            "特色圖示 (建議方形小圖)",
                            settings.brandFeatures?.[index]?.iconUrl,
                            (val) => {
                                const newFeatures = [...(settings.brandFeatures || [])];
                                if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                                newFeatures[index].iconUrl = val;
                                updateSettingsLocal({ brandFeatures: newFeatures });
                            }
                        )}
                     </div>

                     {/* Row 2: Title */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">標題</label>
                        <input 
                            type="text"
                            placeholder="例如：每日新鮮直送"
                            value={settings.brandFeatures?.[index]?.title || ''}
                            onChange={(e) => {
                                const newFeatures = [...(settings.brandFeatures || [])];
                                if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                                newFeatures[index].title = e.target.value;
                                updateSettingsLocal({ brandFeatures: newFeatures });
                            }}
                            className={inputClass}
                        />
                     </div>

                     {/* Row 3: Description */}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">內文描述</label>
                        <textarea 
                            placeholder="詳細說明..."
                            value={settings.brandFeatures?.[index]?.description || ''}
                            onChange={(e) => {
                                const newFeatures = [...(settings.brandFeatures || [])];
                                if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                                newFeatures[index].description = e.target.value;
                                updateSettingsLocal({ brandFeatures: newFeatures });
                            }}
                            className={inputClass}
                            rows={3}
                        />
                     </div>
                 </div>
             ))}
         </div>

         {/* Footer Icons */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="font-bold text-slate-800 dark:text-white">底部承諾標章</h4>
             <div className="space-y-3">
                 {[0, 1, 2].map((index) => (
                     <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 items-start sm:items-end">
                         <div className="flex-1 w-full sm:w-auto">
                             {renderImageSetting(
                                 `標章圖示 #${index+1}`,
                                 settings.brandFooterItems?.[index]?.iconUrl,
                                 (val) => {
                                     const newItems = [...(settings.brandFooterItems || [])];
                                     if (!newItems[index]) newItems[index] = { text: '' };
                                     newItems[index].iconUrl = val;
                                     updateSettingsLocal({ brandFooterItems: newItems });
                                 }
                             )}
                         </div>
                         <div className="flex-1 w-full sm:w-auto space-y-1">
                             <label className="text-xs font-bold text-slate-500">標章文字</label>
                             <input 
                                type="text"
                                placeholder="例如：低溫宅配"
                                value={settings.brandFooterItems?.[index]?.text || ''}
                                onChange={(e) => {
                                    const newItems = [...(settings.brandFooterItems || [])];
                                    if (!newItems[index]) newItems[index] = { text: '' };
                                    newItems[index].text = e.target.value;
                                    updateSettingsLocal({ brandFooterItems: newItems });
                                }}
                                className={inputClass}
                             />
                         </div>
                     </div>
                 ))}
             </div>
         </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6 animate-fade-in w-full">
         <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
             <Icons.Image className="text-purple-600" size={24} />
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">網站外觀設定</h3>
         </div>

         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
             {renderImageSetting(
                 "網站 Logo (建議 40x40 png)",
                 settings.websiteLogo,
                 (val) => updateSettingsLocal({ websiteLogo: val })
             )}
             {renderImageSetting(
                 "網站 Favicon (瀏覽器分頁圖示)",
                 settings.websiteFavicon,
                 (val) => updateSettingsLocal({ websiteFavicon: val })
             )}
         </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">訂單管理</h3>
          
          {/* New Clear Orders Button */}
          <button
              onClick={handleDeleteAllOrders}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow-sm text-sm font-bold"
          >
              <Icons.Trash size={16} /> 清除所有訂單
          </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-4">
          <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-500">搜尋 (訂單編號 / 客戶 / 電話)</label>
              <div className="relative">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="請輸入關鍵字..." 
                      value={orderSearchTerm}
                      onChange={(e) => setOrderSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
              </div>
          </div>
          
          <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-500">配送方式</label>
              <div className="relative">
                  <select
                      value={filterShippingType}
                      onChange={(e) => setFilterShippingType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 dark:text-slate-300"
                  >
                      <option value="all">全部方式</option>
                      <option value="store">超商取貨</option>
                      <option value="delivery">黑貓宅配</option>
                  </select>
              </div>
          </div>

          <div className="md:col-span-2 space-y-1">
               <label className="text-xs font-bold text-slate-500">開始日期</label>
               <input 
                  type="date" 
                  value={orderDateRange.start}
                  onChange={(e) => setOrderDateRange({...orderDateRange, start: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 dark:text-slate-300"
               />
          </div>
          <div className="md:col-span-2 space-y-1">
               <label className="text-xs font-bold text-slate-500">結束日期</label>
               <input 
                  type="date" 
                  value={orderDateRange.end}
                  onChange={(e) => setOrderDateRange({...orderDateRange, end: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 dark:text-slate-300"
               />
          </div>
          <div className="md:col-span-2 flex justify-end">
              {(orderSearchTerm || orderDateRange.start || orderDateRange.end || filterShippingType !== 'all') && (
                  <button 
                      onClick={() => {
                          setOrderSearchTerm('');
                          setOrderDateRange({ start: '', end: '' });
                          setFilterShippingType('all');
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                      title="清除篩選"
                  >
                      <Icons.Trash size={16} /> 重設
                  </button>
              )}
          </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                    <th className="px-4 py-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('id')}>
                        訂單編號 {sortConfig?.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">配送方式</th>
                    <th className="px-4 py-3 whitespace-nowrap">建立時間</th>
                    <th className="px-4 py-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('customer')}>
                        客戶 {sortConfig?.key === 'customer' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3">金額</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3 whitespace-nowrap">最後更新</th>
                </tr>
            </thead>
            <tbody>
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
                    <tr key={order.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <td className="px-4 py-3 font-mono">{order.id}</td>
                        <td className="px-4 py-3 text-xs">
                             <span className={`px-2 py-1 rounded border text-[10px] font-bold ${
                                 order.shippingType === 'delivery' 
                                 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                 : 'bg-blue-50 text-blue-700 border-blue-200'
                             }`}>
                                 {order.shippingType === 'delivery' ? '宅配' : '超取'}
                             </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{order.date}</td>
                        <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-white">{order.customerName}</div>
                            <div className="text-xs opacity-70">{order.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3">${order.total}</td>
                        <td className="px-4 py-3">
                            <select 
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                                className={`bg-transparent border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs font-bold focus:outline-none ${
                                    order.status === '訂單完成' ? 'text-green-600' : 
                                    order.status === '已出貨' ? 'text-blue-600' : 
                                    order.status === '訂單取消' ? 'text-red-600' : 
                                    order.status === '待匯款' ? 'text-yellow-600' :
                                    order.status === '匯款逾期' ? 'text-orange-600' :
                                    'text-purple-600'
                                }`}
                            >
                                <option value="待匯款">待匯款</option>
                                <option value="商品處理中">商品處理中</option>
                                <option value="已出貨">已出貨</option>
                                <option value="訂單完成">訂單完成</option>
                                <option value="匯款逾期">匯款逾期</option>
                                <option value="訂單取消">訂單取消</option>
                            </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                            {order.lastUpdated || '-'}
                        </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            沒有找到符合條件的訂單
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* Pagination */}
      {processedOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
             <span className="text-xs text-slate-500 dark:text-slate-400">
                 顯示第 {(orderPage - 1) * ITEMS_PER_PAGE + 1} 至 {Math.min(orderPage * ITEMS_PER_PAGE, processedOrders.length)} 筆，共 {processedOrders.length} 筆資料
             </span>
             <div className="flex gap-2">
                 <button 
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    disabled={orderPage === 1}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                 >
                     <Icons.ArrowRight className="rotate-180" size={16} />
                 </button>
                 
                 {/* Page Numbers */}
                 <div className="flex gap-1">
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                         // Simple pagination logic: show first, last, current, and neighbors
                         if (totalPages > 7 && Math.abs(page - orderPage) > 1 && page !== 1 && page !== totalPages) {
                             if (Math.abs(page - orderPage) === 2) return <span key={page} className="px-1 self-center text-slate-400 text-xs">...</span>;
                             return null;
                         }
                         return (
                             <button
                                key={page}
                                onClick={() => setOrderPage(page)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                    orderPage === page 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                             >
                                 {page}
                             </button>
                         );
                     })}
                 </div>

                 <button 
                    onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))}
                    disabled={orderPage === totalPages}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                 >
                     <Icons.ArrowRight size={16} />
                 </button>
             </div>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    // ... existing Settings Tab content ...
    <div className="space-y-6 animate-fade-in w-full">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <Icons.Settings className="text-slate-600 dark:text-slate-400" size={24} />
        <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">系統設定 (物流/金流/通知)</h3>
            {settings.lastUpdated && (
                <span className="text-xs text-slate-400 font-normal">上次更新：{settings.lastUpdated}</span>
            )}
        </div>
      </div>

      {/* Telegram Notification Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
             <div className="w-32 h-32 bg-blue-400 rounded-full blur-3xl"></div>
         </div>
         <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="flex items-center gap-2">
                 <div className="bg-blue-500 text-white p-1.5 rounded-lg">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2L2 10.5L10.5 12.5L20 22L12.5 13.5L21.5 2Z"></path></svg>
                 </div>
                 <h4 className="font-bold text-slate-900 dark:text-white">Telegram 訂單通知 (替代 Line Notify)</h4>
             </div>
         </div>

         <div className="space-y-4 relative z-10">
             <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                 <p className="font-bold mb-1">💡 如何設定？</p>
                 <ol className="list-decimal pl-4 space-y-1 opacity-90 text-xs">
                     <li>在 Telegram 搜尋 <b>@BotFather</b>，輸入 <code>/newbot</code> 建立機器人，取得 <b>Token</b>。</li>
                     <li>在 Telegram 搜尋 <b>@userinfobot</b> (或其他 ID Bot)，取得您的 <b>Chat ID</b>。</li>
                     <li><b>重要：</b>請先用您的 Telegram 帳號傳送隨意訊息給剛建立的機器人，以開通權限。</li>
                 </ol>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Bot Token</label>
                     <input 
                        type="text"
                        value={settings.telegramBotToken || ''}
                        onChange={(e) => updateSettingsLocal({ telegramBotToken: e.target.value })}
                        className={`${inputClass} font-mono`}
                        placeholder="例如：123456789:ABCdefGHIjklMNOpqrs..."
                     />
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Chat ID</label>
                     <input 
                        type="text"
                        value={settings.telegramChatId || ''}
                        onChange={(e) => updateSettingsLocal({ telegramChatId: e.target.value })}
                        className={`${inputClass} font-mono`}
                        placeholder="例如：987654321"
                     />
                 </div>
             </div>

             <div className="flex justify-end">
                 <button 
                    onClick={handleTestTelegram}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                 >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>
                    發送測試訊息
                 </button>
             </div>
         </div>
      </div>
      
      {/* Logistics Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                 <Icons.Truck className="text-blue-600" />
                 <h4 className="font-bold text-slate-900 dark:text-white">取貨方式設定</h4>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={settings.enableStoreIntegration}
                    onChange={(e) => updateSettingsLocal({ enableStoreIntegration: e.target.checked })}
                    className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                    {settings.enableStoreIntegration ? '啟用自動地圖整合' : '使用手動查詢'}
                </span>
             </label>
         </div>
         
         {!settings.enableStoreIntegration && (
             <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">手動查詢提示文字</label>
                     <textarea 
                        value={settings.storeFallbackMessage}
                        onChange={(e) => updateSettingsLocal({ storeFallbackMessage: e.target.value })}
                        className={inputClass}
                        rows={2}
                     />
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">門市查詢連結</label>
                     <input 
                        type="text"
                        value={settings.storeLookupLink}
                        onChange={(e) => updateSettingsLocal({ storeLookupLink: e.target.value })}
                        className={inputClass}
                     />
                 </div>
             </div>
         )}
      </div>

      {/* Payment Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                 <Icons.Card className="text-green-600" />
                 <h4 className="font-bold text-slate-900 dark:text-white">線上支付設定</h4>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={settings.enableOnlinePayment}
                    onChange={(e) => updateSettingsLocal({ enableOnlinePayment: e.target.checked })}
                    className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-300">
                    {settings.enableOnlinePayment ? '啟用線上支付' : '使用銀行轉帳'}
                </span>
             </label>
         </div>
         
         {!settings.enableOnlinePayment && (
             <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">銀行代碼 / 名稱</label>
                     <input 
                        type="text"
                        value={settings.bankName}
                        onChange={(e) => updateSettingsLocal({ bankName: e.target.value })}
                        className={inputClass}
                        placeholder="例如：822 中國信託"
                     />
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">匯款帳號</label>
                     <input 
                        type="text"
                        value={settings.bankAccount}
                        onChange={(e) => updateSettingsLocal({ bankAccount: e.target.value })}
                        className={`${inputClass} font-mono`}
                        placeholder="例如：1234567890"
                     />
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">戶名</label>
                     <input 
                        type="text"
                        value={settings.bankAccountName}
                        onChange={(e) => updateSettingsLocal({ bankAccountName: e.target.value })}
                        className={inputClass}
                     />
                 </div>
             </div>
         )}
      </div>
    </div>
  );

  // --- Main Render ---
  return (
    <div className="pb-24 md:pb-8 pt-8 px-4 max-w-7xl mx-auto min-h-screen">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icons.Settings className="text-slate-400" />
                後台管理系統
            </h1>
            <p className="text-sm text-slate-500 mt-1">管理商品、品牌形象與訂單</p>
        </div>
        <button 
            onClick={onLogout}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors"
        >
            登出
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <button 
                onClick={() => setActiveTab('products')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Product size={20} /> 商品管理
             </button>
             <button 
                onClick={() => setActiveTab('brand')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'brand' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Brand size={20} /> 品牌介紹
             </button>
             <button 
                onClick={() => setActiveTab('appearance')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'appearance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Image size={20} /> 網站外觀
             </button>
             <button 
                onClick={() => setActiveTab('orders')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Order size={20} /> 訂單管理
             </button>
             <button 
                onClick={() => setActiveTab('settings')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Settings size={20} /> 系統設定
             </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[500px]">
              {activeTab === 'products' && renderProductsTab()}
              {activeTab === 'brand' && renderBrandTab()}
              {activeTab === 'appearance' && renderAppearanceTab()}
              {activeTab === 'orders' && renderOrdersTab()}
              {activeTab === 'settings' && renderSettingsTab()}
          </div>
      </div>

      {/* Edit Product Modal (Keep existing structure but ensure no conflicts) */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">{editingProduct.id.startsWith('p') ? '新增商品' : '編輯商品'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)}><Icons.Close /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">商品名稱</label>
                            <input type="text" value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">價格</label>
                            <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500">商品分類</label>
                             <select value={editingProduct.category || 'store'} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})} className={inputClass}>
                                 <option value="store">超取含運組</option>
                                 <option value="delivery">宅配大禮包</option>
                             </select>
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500">行銷標籤</label>
                             <div className="flex gap-2">
                                <select 
                                    value={['熱銷推薦', '節慶限定', ''].includes(editingProduct.badge || '') ? editingProduct.badge : 'custom'} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== 'custom') setEditingProduct({...editingProduct, badge: val});
                                        else setEditingProduct({...editingProduct, badge: '新品上市'});
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">無標籤</option>
                                    <option value="熱銷推薦">熱銷推薦</option>
                                    <option value="節慶限定">節慶限定</option>
                                    <option value="custom">自訂...</option>
                                </select>
                                { !['熱銷推薦', '節慶限定', ''].includes(editingProduct.badge || '') && (
                                    <input type="text" value={editingProduct.badge || ''} onChange={(e) => setEditingProduct({...editingProduct, badge: e.target.value})} className={inputClass} placeholder="輸入標籤" />
                                )}
                             </div>
                        </div>
                    </div>
                    
                    {/* Image Management Section */}
                    <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500">商品圖片 (最多6張)</label>
                            <span className="text-xs text-slate-400">{editingProduct.images.length}/6</span>
                         </div>
                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                             {editingProduct.images.map((img, idx) => (
                                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                     <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                         <div className="flex gap-1">
                                             {idx > 0 && <button onClick={() => handleMoveImage(idx, 'left')} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><Icons.ArrowRight className="rotate-180" size={12}/></button>}
                                             {idx < editingProduct.images.length - 1 && <button onClick={() => handleMoveImage(idx, 'right')} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><Icons.ArrowRight size={12}/></button>}
                                         </div>
                                         <button onClick={() => handleDeleteImage(idx)} className="p-1 bg-red-500/80 hover:bg-red-500 rounded text-white"><Icons.Trash size={12}/></button>
                                     </div>
                                     {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] text-center font-bold py-0.5">首圖</span>}
                                 </div>
                             ))}
                             {editingProduct.images.length < 6 && (
                                 <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 text-slate-400 transition-colors">
                                     <Icons.Plus size={20} />
                                     <span className="text-[10px] font-bold mt-1">上傳</span>
                                     <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                 </label>
                             )}
                         </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">圖片 URL (若需使用外部連結)</label>
                        <input type="text" placeholder="貼上外部圖片連結後，圖片會自動加入上方列表" onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val && editingProduct.images.length < 6) {
                                        setEditingProduct({...editingProduct, images: [...editingProduct.images, val]});
                                        (e.target as HTMLInputElement).value = '';
                                    } else if (editingProduct.images.length >= 6) { alert("圖片數量已達上限"); }
                                }
                            }} className={inputClass} />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500">短描述 (特色列表，用逗號分隔)</label>
                         <textarea value={editingProduct.description.join(',')} onChange={e => setEditingProduct({...editingProduct, description: e.target.value.split(',')})} className={inputClass} rows={3} />
                    </div>
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500">詳細介紹</label>
                         <textarea value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} className={inputClass} rows={5} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isActive" checked={editingProduct.isActive !== false} onChange={e => setEditingProduct({...editingProduct, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300">商品上架中</label>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">取消</button>
                    <button onClick={handleSaveProduct} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? '儲存中...' : '儲存變更'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
