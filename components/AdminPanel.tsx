import React, { useState } from 'react';
import { Product, Order, SiteSettings } from '../types';
import { Icons } from './Icons';
import { saveProduct, removeProduct, updateOrderStatus, saveSettings } from '../services/firebaseService';

interface AdminPanelProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, setProducts, orders, setOrders, settings, setSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings'>('products');
  const [isSaving, setIsSaving] = useState(false);
  
  // --- Product Management State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Order Sorting State ---
  const [sortConfig, setSortConfig] = useState<{ key: 'customer' | 'date' | 'id', direction: 'asc' | 'desc' } | null>(null);

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      title: '新海鮮禮盒',
      price: 1000,
      description: ['特色1', '特色2'],
      images: ['https://images.unsplash.com/photo-1534483509719-3feaee7c30da?q=80&w=600&auto=format&fit=crop'],
      longDescription: '',
      isActive: true
    };
    setEditingProduct(newProduct);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
        await saveProduct(editingProduct); // Save to Firebase
        
        // Update Local State
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
        alert("儲存失敗，請檢查網路或權限");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('確定要刪除此商品嗎？')) {
      try {
          await removeProduct(id); // Delete from Firebase
          setProducts(prev => prev.filter(p => p.id !== id));
      } catch (e) {
          alert("刪除失敗");
      }
    }
  };

  // --- Image Handling ---
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
                      return {
                          ...prev,
                          images: [...prev.images, event.target!.result as string]
                      };
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
    
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, lastUpdated: timestamp } : o));
    
    try {
        await updateOrderStatus(orderId, newStatus);
    } catch (e) {
        console.error("Failed to update status in DB", e);
        // Could revert state here if strict consistency is needed
    }
  };

  const handleSort = (key: 'customer' | 'date' | 'id') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const getSortedOrders = () => {
      if (!sortConfig) return orders;
      
      return [...orders].sort((a, b) => {
          let aVal = '';
          let bVal = '';
          
          if (sortConfig.key === 'customer') {
              aVal = a.customerName;
              bVal = b.customerName;
          } else if (sortConfig.key === 'date') {
              aVal = a.date;
              bVal = b.date;
          } else {
              aVal = a.id;
              bVal = b.id;
          }

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  };

  // --- Settings Management ---
  const updateSettingsLocal = (newSettings: Partial<SiteSettings>) => {
      const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
      const updated = { ...settings, ...newSettings, lastUpdated: timestamp };
      setSettings(updated);
      
      // Debounce saving to DB could be better, but saving directly for now
      saveSettings(updated).catch(e => console.error("Settings save failed", e));
  };

  // --- Renderers ---

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
              <span className={`text-xs px-2 py-0.5 rounded-full ${product.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                {product.isActive !== false ? '上架中' : '已下架'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEditProduct(product)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <Icons.Edit size={20} />
              </button>
              <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <Icons.Trash size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">訂單管理</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                    <th className="px-4 py-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('id')}>
                        訂單編號 {sortConfig?.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
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
                {getSortedOrders().map(order => (
                    <tr key={order.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <td className="px-4 py-3 font-mono">{order.id}</td>
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
                                    order.status === '已完成' ? 'text-green-600' : 
                                    order.status === '已出貨' ? 'text-blue-600' : 
                                    order.status === '已取消' ? 'text-red-600' : 'text-orange-500'
                                }`}
                            >
                                <option value="處理中">處理中</option>
                                <option value="已出貨">已出貨</option>
                                <option value="已完成">已完成</option>
                                <option value="已取消">已取消</option>
                            </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                            {order.lastUpdated || '-'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );

  const inputClass = "w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">系統設定</h3>
        {settings.lastUpdated && (
            <span className="text-xs text-slate-400">上次更新：{settings.lastUpdated}</span>
        )}
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
    <div className="pb-24 md:pb-8 pt-8 px-4 max-w-6xl mx-auto min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icons.Settings className="text-slate-400" />
            後台管理系統
        </h1>
        <p className="text-sm text-slate-500 mt-1">管理商品上架、訂單狀態與系統參數</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
             <button 
                onClick={() => setActiveTab('products')}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors flex-shrink-0 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                 <Icons.Product size={20} /> 商品管理
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
              {activeTab === 'orders' && renderOrdersTab()}
              {activeTab === 'settings' && renderSettingsTab()}
          </div>
      </div>

      {/* Edit Product Modal */}
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
                            <input 
                                type="text" 
                                value={editingProduct.title} 
                                onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">價格</label>
                            <input 
                                type="number" 
                                value={editingProduct.price} 
                                onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    
                    {/* Image Management Section */}
                    <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500">商品圖片 (最多6張)</label>
                            <span className="text-xs text-slate-400">{editingProduct.images.length}/6</span>
                         </div>
                         
                         {/* Image Grid */}
                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                             {editingProduct.images.map((img, idx) => (
                                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                     <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                     {/* Overlay Actions */}
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                         <div className="flex gap-1">
                                             {idx > 0 && (
                                                <button onClick={() => handleMoveImage(idx, 'left')} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><Icons.ArrowRight className="rotate-180" size={12}/></button>
                                             )}
                                             {idx < editingProduct.images.length - 1 && (
                                                <button onClick={() => handleMoveImage(idx, 'right')} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><Icons.ArrowRight size={12}/></button>
                                             )}
                                         </div>
                                         <button onClick={() => handleDeleteImage(idx)} className="p-1 bg-red-500/80 hover:bg-red-500 rounded text-white"><Icons.Trash size={12}/></button>
                                     </div>
                                     {/* Cover Label */}
                                     {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] text-center font-bold py-0.5">首圖</span>}
                                 </div>
                             ))}
                             
                             {/* Add Button */}
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
                        <input 
                            type="text" 
                            placeholder="貼上外部圖片連結後，圖片會自動加入上方列表"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val && editingProduct.images.length < 6) {
                                        setEditingProduct({...editingProduct, images: [...editingProduct.images, val]});
                                        (e.target as HTMLInputElement).value = '';
                                    } else if (editingProduct.images.length >= 6) {
                                        alert("圖片數量已達上限");
                                    }
                                }
                            }}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500">短描述 (特色列表，用逗號分隔)</label>
                         <textarea 
                            value={editingProduct.description.join(',')} 
                            onChange={e => setEditingProduct({...editingProduct, description: e.target.value.split(',')})}
                            className={inputClass}
                            rows={3}
                        />
                    </div>
                    
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500">詳細介紹</label>
                         <textarea 
                            value={editingProduct.longDescription || ''} 
                            onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})}
                            className={inputClass}
                            rows={5}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="isActive"
                            checked={editingProduct.isActive !== false}
                            onChange={e => setEditingProduct({...editingProduct, isActive: e.target.checked})}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300">商品上架中</label>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">取消</button>
                    <button onClick={handleSaveProduct} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;