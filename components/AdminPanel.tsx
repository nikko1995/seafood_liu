
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

type AdminTab = 'products' | 'brand' | 'appearance' | 'orders' | 'settings';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, setProducts, orders, setOrders, settings, setSettings, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: 'customer' | 'date' | 'id', direction: 'asc' | 'desc' } | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDateRange, setOrderDateRange] = useState({ start: '', end: '' });
  const [filterShippingType, setFilterShippingType] = useState<'all' | 'store' | 'delivery'>('all');
  const [orderPage, setOrderPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearchTerm, orderDateRange, filterShippingType]);

  useEffect(() => {
      if (isEditModalOpen) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = '';
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
      category: 'store',
      badge: '' 
    };
    setEditingProduct(newProduct);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    const imagesTotalSize = editingProduct.images.reduce((acc, img) => acc + img.length, 0);
    const estimatedDocSizeKB = Math.round(imagesTotalSize / 1024);
    
    if (estimatedDocSizeKB > 995) {
        alert(`儲存失敗：照片數據過大 (${estimatedDocSizeKB}KB)，已接近資料庫上限。請嘗試移除 1 張照片或手動調整原始圖檔大小。`);
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
        alert(`儲存失敗：可能是圖片體積過大，請減少圖片數量。`);
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

  // --- 高品質智慧圖片處理：保留原始品質或高品質縮放 ---
  const processImage = (base64Str: string): Promise<string> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = base64Str;
          img.onload = () => {
              const MAX_LIMIT = 880;
              // 如果原始尺寸已經符合限制，直接回傳原始 Base64 (保留原格式如 WebP)
              if (img.width <= MAX_LIMIT && img.height <= MAX_LIMIT) {
                  resolve(base64Str);
                  return;
              }

              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_LIMIT) {
                      height *= MAX_LIMIT / width;
                      width = MAX_LIMIT;
                  }
              } else {
                  if (height > MAX_LIMIT) {
                      width *= MAX_LIMIT / height;
                      height = MAX_LIMIT;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
              }
              // 使用更高的 0.95 品質進行壓縮
              resolve(canvas.toDataURL('image/jpeg', 0.95));
          };
      });
  };

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
                  const processedBase64 = await processImage(originalBase64);
                  setEditingProduct(prev => {
                      if (!prev) return null;
                      return { ...prev, images: [...prev.images, processedBase64] };
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

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, lastUpdated: timestamp } : o));
    try { await updateOrderStatus(orderId, newStatus); } catch (e) { console.error(e); }
  };

  const handleDeleteAllOrders = async () => {
    if (confirm('確定要清除所有訂單嗎？')) {
        setIsSaving(true);
        try {
            await deleteAllOrders();
            setOrders([]);
            alert('所有訂單已清除。');
        } catch(e) {
            alert('清除失敗');
        } finally {
            setIsSaving(false);
        }
    }
  };

  const handleSort = (key: 'customer' | 'date' | 'id') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const getProcessedOrders = () => {
      let result = [...orders];
      if (orderSearchTerm.trim()) {
          const term = orderSearchTerm.toLowerCase().trim();
          result = result.filter(o => o.id.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term) || o.customerPhone.includes(term));
      }
      if (orderDateRange.start) result = result.filter(o => o.date >= orderDateRange.start);
      if (orderDateRange.end) result = result.filter(o => o.date <= orderDateRange.end + ' 23:59:59');
      if (filterShippingType !== 'all') result = result.filter(o => o.shippingType === filterShippingType);
      if (sortConfig) {
          result.sort((a, b) => {
              let aVal = '', bVal = '';
              if (sortConfig.key === 'customer') { aVal = a.customerName; bVal = b.customerName; }
              else if (sortConfig.key === 'date') { aVal = a.date; bVal = b.date; }
              else { aVal = a.id; bVal = b.id; }
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      } else result.sort((a, b) => b.date.localeCompare(a.date));
      return result;
  };

  const processedOrders = getProcessedOrders();
  const paginatedOrders = processedOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE);

  const updateSettingsLocal = (newSettings: Partial<SiteSettings>) => {
      const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
      const updated = { ...settings, ...newSettings, lastUpdated: timestamp };
      setSettings(updated);
      saveSettings(updated).catch(e => console.error("Settings save failed", e));
  };

  const handleTestTelegram = async () => {
      if (!settings.telegramBotToken || !settings.telegramChatId) { alert('請填寫 Token/ID'); return; }
      const success = await sendTelegramNotification(settings.telegramBotToken, settings.telegramChatId, '🎉 測試成功！');
      if (success) alert('發送成功！'); else alert('發送失敗');
  };

  const inputClass = "w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none";

  const renderImageSetting = (label: string, value: string | undefined, onUpdate: (val: string) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                 if (ev.target?.result) {
                     const processed = await processImage(ev.target.result as string);
                     onUpdate(processed);
                 }
            };
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-lg">
                <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Icons.Upload size={14} /> 上傳
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="flex-1 overflow-hidden truncate text-xs font-mono text-slate-500 dark:text-slate-400">
                    {value ? '已設定高品質圖片' : '未設定'}
                </div>
                {value && <button onClick={() => onUpdate('')} className="p-1.5 text-slate-400 hover:text-red-500"><Icons.Trash size={14} /></button>}
            </div>
        </div>
    );
  };

  return (
    <div className="pb-24 md:pb-8 pt-8 px-4 max-w-7xl mx-auto min-h-screen">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Icons.Settings />後台管理系統</h1>
        <button onClick={onLogout} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold text-sm">登出</button>
      </header>
      <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
             <button onClick={() => setActiveTab('products')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 font-medium transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Icons.Product size={20} /> 商品管理</button>
             <button onClick={() => setActiveTab('brand')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 font-medium transition-all ${activeTab === 'brand' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Icons.Brand size={20} /> 品牌介紹</button>
             <button onClick={() => setActiveTab('appearance')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 font-medium transition-all ${activeTab === 'appearance' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Icons.Image size={20} /> 網站外觀</button>
             <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 font-medium transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Icons.Order size={20} /> 訂單管理</button>
             <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 font-medium transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Icons.Settings size={20} /> 系統設定</button>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">商品管理</h3>
                    <button onClick={handleCreateProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md hover:bg-blue-700 transition-colors"><Icons.Plus size={18} /> 新增商品</button>
                  </div>
                  <div className="grid gap-4">
                    {products.map(p => (
                      <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 flex items-center gap-4 shadow-sm">
                        <img src={p.images[0]} className="w-20 h-20 object-cover rounded-lg bg-slate-100" />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white">{p.title}</h4>
                          <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-1">${p.price}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditProduct(p)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Icons.Edit size={20} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Icons.Trash size={20} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'brand' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b dark:border-slate-700 pb-4 text-slate-900 dark:text-white">品牌介紹設定</h3>
                    {renderImageSetting("Banner 圖片", settings.brandBannerImage, (val) => updateSettingsLocal({ brandBannerImage: val }))}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Banner 標題</label>
                        <input type="text" value={settings.brandBannerTitle || ''} onChange={(e) => updateSettingsLocal({ brandBannerTitle: e.target.value })} className={inputClass} placeholder="例如：來自大溪漁港的堅持" />
                    </div>
                    <div className="space-y-4">
                        {[0, 1].map(idx => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700 space-y-3">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">品牌特色 #{idx+1}</span>
                                {renderImageSetting("圖示 / 照片", settings.brandFeatures?.[idx]?.iconUrl, (val) => {
                                    const next = [...(settings.brandFeatures || [])];
                                    if(!next[idx]) next[idx] = { title: '', description: '' };
                                    next[idx].iconUrl = val;
                                    updateSettingsLocal({ brandFeatures: next });
                                })}
                                <input type="text" value={settings.brandFeatures?.[idx]?.title || ''} onChange={(e) => {
                                    const next = [...(settings.brandFeatures || [])];
                                    if(!next[idx]) next[idx] = { title: '', description: '' };
                                    next[idx].title = e.target.value;
                                    updateSettingsLocal({ brandFeatures: next });
                                }} className={inputClass} placeholder="特色標題" />
                                <textarea value={settings.brandFeatures?.[idx]?.description || ''} onChange={(e) => {
                                    const next = [...(settings.brandFeatures || [])];
                                    if(!next[idx]) next[idx] = { title: '', description: '' };
                                    next[idx].description = e.target.value;
                                    updateSettingsLocal({ brandFeatures: next });
                                }} className={inputClass} rows={2} placeholder="特色詳細描述" />
                            </div>
                        ))}
                    </div>
                </div>
              )}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b dark:border-slate-700 pb-4 text-slate-900 dark:text-white">網站外觀設定</h3>
                    {renderImageSetting("網站 Logo (建議透明背景 PNG)", settings.websiteLogo, (val) => updateSettingsLocal({ websiteLogo: val }))}
                    {renderImageSetting("網站 Favicon (分頁小圖示)", settings.websiteFavicon, (val) => updateSettingsLocal({ websiteFavicon: val }))}
                </div>
              )}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">訂單管理</h3>
                      <button onClick={handleDeleteAllOrders} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors">清除所有訂單</button>
                  </div>
                  <div className="overflow-x-auto border dark:border-slate-700 rounded-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:text-blue-500" onClick={() => handleSort('id')}>單號</th>
                                <th className="px-4 py-3">方式</th>
                                <th className="px-4 py-3">建立</th>
                                <th className="px-4 py-3">客戶</th>
                                <th className="px-4 py-3">金額</th>
                                <th className="px-4 py-3">狀態</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {paginatedOrders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{o.id}</td>
                                    <td className="px-4 py-3 text-[10px] font-bold">
                                        <span className={`px-2 py-0.5 rounded-full ${o.shippingType === 'delivery' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'}`}>
                                            {o.shippingType === 'delivery' ? '宅配' : '超取'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] text-slate-500 dark:text-slate-400">{o.date}</td>
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{o.customerName}</td>
                                    <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">${o.total}</td>
                                    <td className="px-4 py-3">
                                        <select 
                                            value={o.status} 
                                            onChange={(e) => handleStatusChange(o.id, e.target.value as any)} 
                                            className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                                        >
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
                  {processedOrders.length === 0 && (
                      <div className="text-center py-20 text-slate-400 dark:text-slate-600">目前尚無訂單資料</div>
                  )}
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b dark:border-slate-700 pb-4 text-slate-900 dark:text-white">系統設定</h3>
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Telegram 通知</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={settings.telegramBotToken || ''} onChange={(e) => updateSettingsLocal({ telegramBotToken: e.target.value })} className={inputClass} placeholder="Bot Token" />
                            <input type="text" value={settings.telegramChatId || ''} onChange={(e) => updateSettingsLocal({ telegramChatId: e.target.value })} className={inputClass} placeholder="Chat ID" />
                        </div>
                        <button onClick={handleTestTelegram} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">發送測試訊息</button>
                    </div>
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>收款金流設定</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" value={settings.bankName} onChange={(e) => updateSettingsLocal({ bankName: e.target.value })} className={inputClass} placeholder="銀行名稱與代碼" />
                            <input type="text" value={settings.bankAccount} onChange={(e) => updateSettingsLocal({ bankAccount: e.target.value })} className={inputClass} placeholder="轉帳帳號" />
                            <input type="text" value={settings.bankAccountName} onChange={(e) => updateSettingsLocal({ bankAccountName: e.target.value })} className={inputClass} placeholder="戶名" />
                        </div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white">{editingProduct.id.startsWith('p') ? '新增商品' : '編輯商品'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.Close /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">商品名稱</label>
                            <input type="text" value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className={inputClass} placeholder="請輸入名稱" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">價格 (TWD)</label>
                            <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className={inputClass} placeholder="價格" />
                        </div>
                    </div>
                    
                    <div className="space-y-2 border dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                         <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">商品照片 (尺寸上限 880px / 高品質保存)</label>
                            <span className="text-xs text-slate-400">{editingProduct.images.length}/6</span>
                         </div>
                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                             {editingProduct.images.map((img, idx) => (
                                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border dark:border-slate-700 bg-white">
                                     <img src={img} className="w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                                         <div className="flex gap-1">
                                            {idx > 0 && (
                                                <button onClick={() => handleMoveImage(idx, 'left')} className="p-1 bg-white/20 hover:bg-white text-white hover:text-blue-600 rounded">
                                                    <Icons.ArrowRight className="rotate-180" size={14}/>
                                                </button>
                                            )}
                                            {idx < editingProduct.images.length - 1 && (
                                                <button onClick={() => handleMoveImage(idx, 'right')} className="p-1 bg-white/20 hover:bg-white text-white hover:text-blue-600 rounded">
                                                    <Icons.ArrowRight size={14}/>
                                                </button>
                                            )}
                                         </div>
                                         <button onClick={() => handleDeleteImage(idx)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded">
                                            <Icons.Trash size={14}/>
                                         </button>
                                     </div>
                                     {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] text-center font-bold">主圖</span>}
                                 </div>
                             ))}
                             {editingProduct.images.length < 6 && (
                                 <label className="aspect-square rounded-lg border-2 border-dashed dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 text-slate-400 transition-colors">
                                     <Icons.Plus size={20} />
                                     <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                 </label>
                             )}
                         </div>
                         <div className="mt-2 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">貼心提醒：若圖片小於 880px 系統將原封不動保留（包含 WebP 高清畫質）</span>
                            <span className={`${Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024) > 900 ? 'text-red-500 font-bold animate-pulse' : 'text-slate-400'}`}>
                               目前容量: {Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024)} KB / 1024 KB
                            </span>
                         </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">商品簡短特色 (以逗號隔開)</label>
                        <textarea value={editingProduct.description.join(',')} onChange={e => setEditingProduct({...editingProduct, description: e.target.value.split(',')})} className={inputClass} rows={2} placeholder="例如：大溪直送, 現流急凍" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">詳細商品介紹</label>
                        <textarea value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} className={inputClass} rows={4} placeholder="描述口感、來源或料理方式" />
                    </div>
                </div>
                <div className="p-4 border-t dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors">取消</button>
                    <button onClick={handleSaveProduct} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">{isSaving ? '處理中...' : '儲存變更'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
