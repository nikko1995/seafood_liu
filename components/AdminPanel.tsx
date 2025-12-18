
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

    // Firestore Document 1MB Limit check
    const imagesTotalSize = editingProduct.images.reduce((acc, img) => acc + img.length, 0);
    const estimatedDocSizeKB = Math.round(imagesTotalSize / 1024);
    
    if (estimatedDocSizeKB > 990) {
        alert(`儲存失敗：目前照片總容量 (${estimatedDocSizeKB}KB) 已接近 1MB 限制。雖然已使用 0.92 品質優化，但照片數量或細節過多。請嘗試減少 1 張照片。`);
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
        alert(`儲存失敗：${e.message || "圖片數據太大或權限問題，請檢查照片數量"}`);
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

  // --- 高品質圖片處理：限制 880px * 880px 並使用視覺無損 0.92 品質 ---
  const compressImage = (base64Str: string): Promise<string> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.src = base64Str;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              // 僅限制前台最終呈現尺寸 (880px)
              const MAX_WIDTH = 880;
              const MAX_HEIGHT = 880;
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
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
              }
              // 品質設定為 0.92 (網頁開發最推薦的視覺無損點，體積遠小於 1.0)
              resolve(canvas.toDataURL('image/jpeg', 0.92));
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

  const inputClass = "w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none";

  const renderImageSetting = (label: string, value: string | undefined, onUpdate: (val: string) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
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
            <label className="text-xs font-bold text-slate-500">{label}</label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border p-2 rounded-lg">
                <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-2">
                    <Icons.Upload size={14} /> 上傳
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="flex-1 overflow-hidden truncate text-xs font-mono">
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
        <button onClick={onLogout} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm">登出</button>
      </header>
      <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
             <button onClick={() => setActiveTab('products')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Product size={20} /> 商品管理</button>
             <button onClick={() => setActiveTab('brand')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 ${activeTab === 'brand' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Brand size={20} /> 品牌介紹</button>
             <button onClick={() => setActiveTab('appearance')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 ${activeTab === 'appearance' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Image size={20} /> 網站外觀</button>
             <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Order size={20} /> 訂單管理</button>
             <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-lg flex items-center gap-3 flex-shrink-0 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800'}`}><Icons.Settings size={20} /> 系統設定</button>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">商品管理</h3>
                    <button onClick={handleCreateProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Icons.Plus size={18} /> 新增商品</button>
                  </div>
                  <div className="grid gap-4">
                    {products.map(p => (
                      <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border flex items-center gap-4">
                        <img src={p.images[0]} className="w-20 h-20 object-cover rounded-lg" />
                        <div className="flex-1">
                          <h4 className="font-bold">{p.title}</h4>
                          <p className="text-blue-600 font-bold">${p.price}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditProduct(p)} className="p-2 hover:bg-slate-100 rounded-lg"><Icons.Edit size={20} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Icons.Trash size={20} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'brand' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b pb-4">品牌介紹設定</h3>
                    {renderImageSetting("Banner 圖片", settings.brandBannerImage, (val) => updateSettingsLocal({ brandBannerImage: val }))}
                    <input type="text" value={settings.brandBannerTitle || ''} onChange={(e) => updateSettingsLocal({ brandBannerTitle: e.target.value })} className={inputClass} placeholder="Banner 標題" />
                    <div className="space-y-4">
                        {[0, 1].map(idx => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-3">
                                <span className="text-xs font-bold text-blue-600">特色 #{idx+1}</span>
                                {renderImageSetting("圖示", settings.brandFeatures?.[idx]?.iconUrl, (val) => {
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
                                }} className={inputClass} placeholder="標題" />
                                <textarea value={settings.brandFeatures?.[idx]?.description || ''} onChange={(e) => {
                                    const next = [...(settings.brandFeatures || [])];
                                    if(!next[idx]) next[idx] = { title: '', description: '' };
                                    next[idx].description = e.target.value;
                                    updateSettingsLocal({ brandFeatures: next });
                                }} className={inputClass} rows={2} placeholder="描述" />
                            </div>
                        ))}
                    </div>
                </div>
              )}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b pb-4">網站外觀設定</h3>
                    {renderImageSetting("網站 Logo", settings.websiteLogo, (val) => updateSettingsLocal({ websiteLogo: val }))}
                    {renderImageSetting("網站 Favicon", settings.websiteFavicon, (val) => updateSettingsLocal({ websiteFavicon: val }))}
                </div>
              )}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">訂單管理</h3>
                      <button onClick={handleDeleteAllOrders} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">清除所有訂單</button>
                  </div>
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700">
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
                            {paginatedOrders.map(o => (
                                <tr key={o.id} className="border-b hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono">{o.id}</td>
                                    <td className="px-4 py-3 text-xs">{o.shippingType === 'delivery' ? '宅配' : '超取'}</td>
                                    <td className="px-4 py-3 text-xs">{o.date}</td>
                                    <td className="px-4 py-3 font-bold">{o.customerName}</td>
                                    <td className="px-4 py-3">${o.total}</td>
                                    <td className="px-4 py-3">
                                        <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value as any)} className="bg-transparent border rounded px-1 text-xs">
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
              )}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold border-b pb-4">系統設定</h3>
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border">
                        <h4 className="font-bold">Telegram 通知</h4>
                        <input type="text" value={settings.telegramBotToken || ''} onChange={(e) => updateSettingsLocal({ telegramBotToken: e.target.value })} className={inputClass} placeholder="Bot Token" />
                        <input type="text" value={settings.telegramChatId || ''} onChange={(e) => updateSettingsLocal({ telegramChatId: e.target.value })} className={inputClass} placeholder="Chat ID" />
                        <button onClick={handleTestTelegram} className="text-xs font-bold text-blue-600">發送測試</button>
                    </div>
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border">
                        <h4 className="font-bold">金流設定</h4>
                        <input type="text" value={settings.bankName} onChange={(e) => updateSettingsLocal({ bankName: e.target.value })} className={inputClass} placeholder="銀行名稱" />
                        <input type="text" value={settings.bankAccount} onChange={(e) => updateSettingsLocal({ bankAccount: e.target.value })} className={inputClass} placeholder="帳號" />
                        <input type="text" value={settings.bankAccountName} onChange={(e) => updateSettingsLocal({ bankAccountName: e.target.value })} className={inputClass} placeholder="戶名" />
                    </div>
                </div>
              )}
          </div>
      </div>

      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">{editingProduct.id.startsWith('p') ? '新增商品' : '編輯商品'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)}><Icons.Close /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className={inputClass} placeholder="商品名稱" />
                        <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className={inputClass} placeholder="價格" />
                    </div>
                    
                    {/* 照片管理區塊 - 限制 880px 並使用優化後的 0.92 品質 */}
                    <div className="space-y-2 border rounded-lg p-3">
                         <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500">商品照片 (尺寸上限 880px / 品質 92%)</label>
                            <span className="text-xs text-slate-400">{editingProduct.images.length}/6</span>
                         </div>
                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                             {editingProduct.images.map((img, idx) => (
                                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
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
                                 <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 text-slate-400">
                                     <Icons.Plus size={20} />
                                     <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                 </label>
                             )}
                         </div>
                         <div className="mt-2 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">建議：0.92 品質可兼顧清晰度與儲存容量</span>
                            <span className={`${Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024) > 900 ? 'text-red-500 font-bold animate-pulse' : 'text-slate-400'}`}>
                               目前容量: {Math.round(editingProduct.images.reduce((a,c)=>a+c.length,0)/1024)} KB / 1024 KB
                            </span>
                         </div>
                    </div>

                    <textarea value={editingProduct.description.join(',')} onChange={e => setEditingProduct({...editingProduct, description: e.target.value.split(',')})} className={inputClass} rows={2} placeholder="短特色 (用逗號隔開)" />
                    <textarea value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} className={inputClass} rows={4} placeholder="詳細商品介紹" />
                </div>
                <div className="p-4 border-t flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 font-bold text-slate-500">取消</button>
                    <button onClick={handleSaveProduct} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50">{isSaving ? '儲存中...' : '儲存變更'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
