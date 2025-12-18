
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

    // --- 安全檢查：Firestore 文件 1MB 限制 ---
    // 我們計算所有圖片的字串長度，估算檔案大小
    const imagesTotalSize = editingProduct.images.reduce((acc, img) => acc + img.length, 0);
    const estimatedDocSizeKB = Math.round(imagesTotalSize / 1024);
    
    if (estimatedDocSizeKB > 900) { // 留一點點餘裕給文字欄位
        alert(`儲存失敗：產品照片總容量 (${estimatedDocSizeKB}KB) 接近 1MB 限制。請嘗試移除 1-2 張照片。`);
        return;
    }

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
    } catch (e: any) {
        console.error("Save error:", e);
        let errorMsg = "儲存失敗";
        if (e.message?.includes("exceeds") || e.code === "out-of-range") {
            errorMsg = "儲存失敗：產品所有照片加起來超過了 1MB 限制，請減少照片數量或重新上傳（系統會自動再壓縮）。";
        } else if (e.message?.includes("permission-denied")) {
            errorMsg = "儲存失敗：權限不足。請確認您已登入，且 Firebase Rules 已開啟。";
        } else {
            errorMsg = `儲存失敗：${e.message || "未知原因"}`;
        }
        alert(errorMsg);
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

  // --- Image Compression Logic (Aggressive for Firestore 1MB Limit) ---
  const compressImage = (base64Str: string): Promise<string> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = base64Str;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              // 調降至 800px，這是網頁顯示的黃金平衡點
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              // 使用高品質插值
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
              }
              
              // 壓縮品質調至 0.5 (Base64 會增加 33% 體積，所以 0.5 很安全)
              // 輸出格式統一為 jpeg 以獲得最小體積
              resolve(canvas.toDataURL('image/jpeg', 0.5));
          };
      });
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
          reader.onload = async (event) => {
              if (event.target?.result) {
                  const originalBase64 = event.target.result as string;
                  // 自動執行極致壓縮
                  const compressedBase64 = await compressImage(originalBase64);
                  
                  setEditingProduct(prev => {
                      if (!prev) return null;
                      return { ...prev, images: [...prev.images, compressedBase64] };
                  });
              }
          };
          reader.readAsDataURL(file);
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

  const getProcessedOrders = () => {
      let result = [...orders];
      if (orderSearchTerm.trim()) {
          const term = orderSearchTerm.toLowerCase().trim();
          result = result.filter(o => 
              o.id.toLowerCase().includes(term) || 
              o.customerName.toLowerCase().includes(term) ||
              o.customerPhone.includes(term)
          );
      }
      if (orderDateRange.start) result = result.filter(o => o.date >= orderDateRange.start);
      if (orderDateRange.end) result = result.filter(o => o.date <= orderDateRange.end + ' 23:59:59');
      if (filterShippingType !== 'all') result = result.filter(o => o.shippingType === filterShippingType);
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
          result.sort((a, b) => b.date.localeCompare(a.date));
      }
      return result;
  };

  const processedOrders = getProcessedOrders();
  const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = processedOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE);

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

  const renderImageSetting = (label: string, value: string | undefined, onUpdate: (val: string) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert("圖片過大，建議 5MB 以下原始圖，系統會自動壓縮"); return; }
            const reader = new FileReader();
            reader.onload = async (ev) => {
                 if (ev.target?.result) {
                     const compressed = await compressImage(ev.target.result as string);
                     onUpdate(compressed);
                 }
            };
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg">
                <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-2 transition-colors flex-shrink-0">
                    <Icons.Upload size={14} /> 上傳更換
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {value ? (
                        <>
                            <Icons.Check size={14} className="text-green-500 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-mono">
                                {value.startsWith('data:') ? '已優化壓縮圖片' : value}
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
                    <button onClick={() => onUpdate('')} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                        <Icons.Trash size={14} />
                    </button>
                )}
            </div>
        </div>
    );
  };

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
    <div className="space-y-6 animate-fade-in w-full">
         <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
             <Icons.Brand className="text-orange-600" size={24} />
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">品牌介紹設定</h3>
         </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="font-bold text-slate-800 dark:text-white">主視覺 Banner</h4>
             {renderImageSetting("Banner 圖片", settings.brandBannerImage, (val) => updateSettingsLocal({ brandBannerImage: val }))}
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500">Banner 標題文字</label>
                 <input type="text" value={settings.brandBannerTitle || ''} onChange={(e) => updateSettingsLocal({ brandBannerTitle: e.target.value })} className={inputClass} />
             </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
             <h4 className="font-bold text-slate-800 dark:text-white">品牌特色區塊</h4>
             {[0, 1].map((index) => (
                 <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 space-y-4">
                     <span className="text-sm font-bold text-blue-600 dark:text-blue-400">特色 #{index + 1}</span>
                     {renderImageSetting("特色圖示", settings.brandFeatures?.[index]?.iconUrl, (val) => {
                        const newFeatures = [...(settings.brandFeatures || [])];
                        if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                        newFeatures[index].iconUrl = val;
                        updateSettingsLocal({ brandFeatures: newFeatures });
                     })}
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">標題</label>
                        <input type="text" value={settings.brandFeatures?.[index]?.title || ''} onChange={(e) => {
                            const newFeatures = [...(settings.brandFeatures || [])];
                            if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                            newFeatures[index].title = e.target.value;
                            updateSettingsLocal({ brandFeatures: newFeatures });
                        }} className={inputClass} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">內文描述</label>
                        <textarea value={settings.brandFeatures?.[index]?.description || ''} onChange={(e) => {
                            const newFeatures = [...(settings.brandFeatures || [])];
                            if (!newFeatures[index]) newFeatures[index] = { title: '', description: '' };
                            newFeatures[index].description = e.target.value;
                            updateSettingsLocal({ brandFeatures: newFeatures });
                        }} className={inputClass} rows={3} />
                     </div>
                 </div>
             ))}
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
             {renderImageSetting("網站 Logo", settings.websiteLogo, (val) => updateSettingsLocal({ websiteLogo: val }))}
             {renderImageSetting("網站 Favicon", settings.websiteFavicon, (val) => updateSettingsLocal({ websiteFavicon: val }))}
         </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">訂單管理</h3>
          <button onClick={handleDeleteAllOrders} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow-sm text-sm font-bold">
              <Icons.Trash size={16} /> 清除所有訂單
          </button>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-4">
          <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-500">搜尋</label>
              <div className="relative">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
          </div>
          <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-500">配送</label>
              <select value={filterShippingType} onChange={(e) => setFilterShippingType(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <option value="all">全部</option>
                  <option value="store">超取</option>
                  <option value="delivery">宅配</option>
              </select>
          </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('id')}>單號</th>
                    <th className="px-4 py-3">方式</th>
                    <th className="px-4 py-3">建立</th>
                    <th className="px-4 py-3">客戶</th>
                    <th className="px-4 py-3">金額</th>
                    <th className="px-4 py-3">狀態</th>
                </tr>
            </thead>
            <tbody>
                {paginatedOrders.map(order => (
                    <tr key={order.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono">{order.id}</td>
                        <td className="px-4 py-3 text-xs">{order.shippingType === 'delivery' ? '宅配' : '超取'}</td>
                        <td className="px-4 py-3 text-xs">{order.date}</td>
                        <td className="px-4 py-3"><b>{order.customerName}</b><div className="text-xs opacity-70">{order.customerPhone}</div></td>
                        <td className="px-4 py-3">${order.total}</td>
                        <td className="px-4 py-3">
                            <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value as any)} className="bg-transparent border border-slate-300 rounded px-2 py-1 text-xs">
                                <option value="待匯款">待匯款</option>
                                <option value="商品處理中">商品處理中</option>
                                <option value="已出貨">已出貨</option>
                                <option value="訂單完成">訂單完成</option>
                                <option value="匯款逾期">匯款逾期</option>
                                <option value="訂單取消">訂單取消</option>
                            </select>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-fade-in w-full">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <Icons.Settings className="text-slate-600 dark:text-slate-400" size={24} />
        <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">系統設定</h3>
            <span className="text-xs text-slate-400">更新：{settings.lastUpdated}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <h4 className="font-bold text-slate-900 dark:text-white mb-4">Telegram 通知</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input type="text" value={settings.telegramBotToken || ''} onChange={(e) => updateSettingsLocal({ telegramBotToken: e.target.value })} className={inputClass} placeholder="Bot Token" />
             <input type="text" value={settings.telegramChatId || ''} onChange={(e) => updateSettingsLocal({ telegramChatId: e.target.value })} className={inputClass} placeholder="Chat ID" />
         </div>
         <button onClick={handleTestTelegram} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-bold">發送測試</button>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <h4 className="font-bold text-slate-900 dark:text-white mb-4">金流設定</h4>
         <div className="space-y-4">
             <input type="text" value={settings.bankName} onChange={(e) => updateSettingsLocal({ bankName: e.target.value })} className={inputClass} placeholder="銀行名稱" />
             <input type="text" value={settings.bankAccount} onChange={(e) => updateSettingsLocal({ bankAccount: e.target.value })} className={inputClass} placeholder="匯款帳號" />
             <input type="text" value={settings.bankAccountName} onChange={(e) => updateSettingsLocal({ bankAccountName: e.target.value })} className={inputClass} placeholder="戶名" />
         </div>
      </div>
    </div>
  );

  return (
    <div className="pb-24 md:pb-8 pt-8 px-4 max-w-7xl mx-auto min-h-screen">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Icons.Settings />後台管理系統</h1>
        <button onClick={onLogout} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm">登出</button>
      </header>
      <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
             <button onClick={() => setActiveTab('products')} className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Product size={20} /> 商品管理</button>
             <button onClick={() => setActiveTab('brand')} className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === 'brand' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Brand size={20} /> 品牌介紹</button>
             <button onClick={() => setActiveTab('appearance')} className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === 'appearance' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Image size={20} /> 網站外觀</button>
             <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Order size={20} /> 訂單管理</button>
             <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Settings size={20} /> 系統設定</button>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              {activeTab === 'products' && renderProductsTab()}
              {activeTab === 'brand' && renderBrandTab()}
              {activeTab === 'appearance' && renderAppearanceTab()}
              {activeTab === 'orders' && renderOrdersTab()}
              {activeTab === 'settings' && renderSettingsTab()}
          </div>
      </div>

      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">{editingProduct.id.startsWith('p') ? '新增商品' : '編輯商品'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)}><Icons.Close /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className={inputClass} placeholder="商品名稱" />
                        <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className={inputClass} placeholder="價格" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <select value={editingProduct.category || 'store'} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})} className={inputClass}>
                             <option value="store">超取含運組</option>
                             <option value="delivery">宅配大禮包</option>
                         </select>
                         <input type="text" value={editingProduct.badge || ''} onChange={(e) => setEditingProduct({...editingProduct, badge: e.target.value})} className={inputClass} placeholder="行銷標籤 (如：熱銷推薦)" />
                    </div>
                    
                    <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500">商品圖片 (最多6張)</label>
                            <span className="text-xs text-slate-400">{editingProduct.images.length}/6</span>
                         </div>
                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                             {editingProduct.images.map((img, idx) => (
                                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                                     <img src={img} alt="" className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                         <button onClick={() => handleDeleteImage(idx)} className="p-1 bg-red-500 rounded text-white"><Icons.Trash size={12}/></button>
                                     </div>
                                 </div>
                             ))}
                             {editingProduct.images.length < 6 && (
                                 <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer text-slate-400">
                                     <Icons.Plus size={20} />
                                     <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                 </label>
                             )}
                         </div>
                         {/* 容量顯示 */}
                         <div className="mt-2 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">提示：照片將自動優化壓縮，以利快速儲存</span>
                            <span className={`${Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024) > 800 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                               估算大小: {Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024)} KB / 1024 KB
                            </span>
                         </div>
                    </div>

                    <textarea value={editingProduct.description.join(',')} onChange={e => setEditingProduct({...editingProduct, description: e.target.value.split(',')})} className={inputClass} rows={2} placeholder="短描述 (逗號隔開)" />
                    <textarea value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} className={inputClass} rows={4} placeholder="詳細介紹" />
                </div>
                <div className="p-4 border-t flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">取消</button>
                    <button onClick={handleSaveProduct} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50">{isSaving ? '儲存中...' : '儲存變更'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

