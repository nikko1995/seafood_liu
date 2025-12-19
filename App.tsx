
import React, { useState, useEffect, useRef } from 'react';
import { Tab, Product, Order, SiteSettings } from './types';
import { Icons } from './components/Icons';
import BottomNav from './components/BottomNav';
import CheckoutFlow from './components/CheckoutFlow';
import ProductDetailModal from './components/ProductDetailModal';
import Header from './components/Header';
import AdminPanel from './components/AdminPanel';
import { fetchProducts, fetchOrders, fetchSettings } from './services/firebaseService';
import { loginAdmin, subscribeToAuth, logoutAdmin } from './services/authService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- State Management ---
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'store' | 'delivery'>('all');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  const [settings, setSettings] = useState<SiteSettings>({
    enableStoreIntegration: false,
    storeFallbackMessage: '請使用下方連結查詢7-11門市，並將「門市名稱」與「店號」填寫於下方欄位。',
    storeLookupLink: 'https://emap.presco.com.tw/c2cemap.ashx',
    enableOnlinePayment: false,
    bankName: '822 中國信託',
    bankAccount: '123-456-78900',
    bankAccountName: '海鮮小劉',
    lastUpdated: new Date().toLocaleString('zh-TW', { hour12: false }),
    brandBannerImage: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?q=80&w=1200&auto=format&fit=crop',
    brandBannerTitle: '來自大溪漁港的堅持',
    brandFeatures: [
        { title: '漁港攤販起家，傳承三代', description: '我們從小在宜蘭大溪漁港長大，看著父執輩在波濤中討生活。從一個小小的魚攤，到現在希望透過網路，將這份最新鮮的美味，零時差送到您的餐桌。' },
        { title: '每日清晨現流，新鮮販售', description: '堅持不賣隔夜貨！每天清晨漁船進港，我們第一時間精選最優質的漁獲，立即進行低溫處理與真空包裝，鎖住大海最原始的鮮甜。' }
    ],
    brandFooterItems: [{ text: '大溪直送' }, { text: '品質保證' }, { text: '低溫宅配' }],
    telegramBotToken: '',
    telegramChatId: ''
  });

  const lastCreatedOrder = useRef<Order | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
        setCurrentUser(user);
        if (!user && activeTab === Tab.ADMIN) setActiveTab(Tab.PRODUCTS);
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fP, fO, fS] = await Promise.all([fetchProducts(), fetchOrders(), fetchSettings()]);
            if (fP && fP.length > 0) setProducts(fP);
            let mergedOrders = fO || [];
            if (lastCreatedOrder.current) {
                const found = mergedOrders.find(o => o.id === lastCreatedOrder.current?.id);
                if (!found) mergedOrders = [lastCreatedOrder.current, ...mergedOrders];
            }
            setOrders(mergedOrders);
            if (fS) setSettings(prev => ({ ...prev, ...fS }));
        } catch (error) {
            console.error("Data load failed", error);
        } finally {
            // 延遲一點點關閉 loading 以確保轉場平滑
            setTimeout(() => setIsLoading(false), 300);
        }
    };

    loadData();
    return () => unsubscribe();
  }, [activeTab]);

  useEffect(() => {
    if (settings.websiteFavicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.getElementsByTagName('head')[0].appendChild(link); }
      link.href = settings.websiteFavicon;
    }
  }, [settings.websiteFavicon]);

  const [searchType, setSearchType] = useState<'id' | 'phone'>('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Order[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBankInfoOpen, setIsBankInfoOpen] = useState(false);

  const handleOpenDetail = (product: Product) => setDetailProduct(product);
  const handleBuyNow = (product: Product) => { setDetailProduct(null); setSelectedProduct(product); setIsCheckoutOpen(true); };

  const handleCheckoutComplete = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    lastCreatedOrder.current = newOrder;
    setIsCheckoutOpen(false);
    setActiveTab(Tab.PRODUCTS);
    setHasSearched(false);
    setSearchResult(null);
    setSearchQuery(''); 
  };

  const handleSearchOrder = () => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    const results = orders.filter(order => {
        const query = searchQuery.trim().toLowerCase();
        return searchType === 'id' ? order.id.toLowerCase().includes(query) : order.customerPhone.includes(query);
    });
    setSearchResult(results);
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      setLoginError(''); setIsLoggingIn(true);
      try {
          await loginAdmin(fd.get('email') as string, fd.get('password') as string);
          setIsAdminLoginOpen(false); setActiveTab(Tab.ADMIN);
      } catch (error: any) { setLoginError('帳號或密碼錯誤'); } finally { setIsLoggingIn(false); }
  };

  const renderBadge = (text: string) => {
      const isHot = text.includes('熱銷');
      const Icon = isHot ? Icons.Flame : Icons.Gift;
      const colorClass = isHot ? 'from-red-600 to-orange-500' : 'from-yellow-500 to-amber-600';
      return (
        <div className={`absolute top-4 left-4 bg-gradient-to-r ${colorClass} text-white text-[12px] font-black px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 z-20 transform hover:scale-105 transition-transform`}>
            <Icon size={14} fill={isHot ? 'currentColor' : 'none'} />
            {text}
        </div>
      );
  };

  // 骨架屏組件
  const ProductSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
        <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800" />
        <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
                <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-5 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/50 rounded-md" />
                <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800/50 rounded-md" />
            </div>
            <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-4" />
        </div>
    </div>
  );

  const renderProducts = () => {
    const filtered = products.filter(p => p.isActive !== false && (selectedCategory === 'all' || p.category === selectedCategory));
    
    return (
    <div className="pb-24 md:pb-8 px-4 max-w-6xl mx-auto animate-fade-in">
      <div className="py-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">來自大海的極致鮮甜 🌊</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide">宜蘭大溪漁港直送，鎖住大海最原始的鮮甜！</p>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 bg-slate-50/95 dark:bg-black/95 backdrop-blur-sm -mx-4 px-4 pt-3 pb-1 mb-2 md:static md:bg-transparent md:p-0 md:mb-6">
        <div className="flex gap-2 overflow-x-auto pb-4 px-1 scrollbar-hide">
            {[
              { id: 'all', label: '所有商品', icon: null },
              { id: 'store', label: '超取含運組', icon: Icons.Store },
              { id: 'delivery', label: '宅配大禮包', icon: Icons.Truck }
            ].map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id as any)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border dark:border-slate-800'}`}>
                {cat.icon && <cat.icon size={14} />} {cat.label}
              </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
              // 載入中顯示骨架屏
              Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : filtered.length === 0 ? (
              // 載入完成但沒資料才顯示空狀態
              <div className="col-span-full text-center py-20 text-slate-400">目前此分類尚無商品</div>
          ) : (
              // 正常顯示商品
              filtered.map((p) => (
                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group flex flex-col h-full hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => handleOpenDetail(p)}>
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {p.badge && renderBadge(p.badge)}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{p.title}</h3>
                          <span className="text-base font-bold text-blue-600 dark:text-blue-400">${p.price}</span>
                      </div>
                      <ul className="space-y-1.5 mb-5 flex-1">
                          {p.description.slice(0, 3).map((item, idx) => ( 
                          <li key={idx} className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                              <div className="w-1 h-1 bg-blue-500 rounded-full mr-2 flex-shrink-0" />
                              {item}
                          </li>
                          ))}
                      </ul>
                      <button onClick={(e) => { e.stopPropagation(); handleBuyNow(p); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs">
                        <Icons.Lightning size={16} fill="currentColor" /> 立即購買
                      </button>
                    </div>
                </div>
              ))
          )}
      </div>
    </div>
  );
  };

  const renderBrand = () => (
    <div className="pb-24 md:pb-8 pt-4 max-w-2xl mx-auto text-center animate-fade-in">
        <div className="w-full aspect-[2/1] rounded-2xl overflow-hidden mb-8 relative shadow-lg mx-4 md:mx-0">
             {isLoading ? (
                 <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
             ) : (
                <>
                    <img src={settings.brandBannerImage} alt="Brand" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col">
                       <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-md">{settings.brandBannerTitle}</h2>
                       <div className="w-12 h-1 bg-blue-500 rounded-full"></div>
                    </div>
                </>
             )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-8 mx-4 md:mx-0 shadow-sm">
            {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                            <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                    </div>
                ))
            ) : (
                [0, 1].map(i => (
                  <div key={i} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                         {settings.brandFeatures?.[i]?.iconUrl ? <img src={settings.brandFeatures[i].iconUrl} className="w-full h-full object-cover" /> : <Icons.Fish size={24} className="text-blue-500" />}
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{settings.brandFeatures?.[i]?.title}</h3>
                          <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm md:text-base">{settings.brandFeatures?.[i]?.description}</p>
                      </div>
                  </div>
                ))
            )}
        </div>
    </div>
  );

  const renderOrderList = (orders: Order[]) => orders.length === 0 ? (
      <div className="text-center py-20 text-slate-400">目前尚無訂單資料</div>
  ) : orders.map((o) => (
    <div key={o.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
            <span className="text-xs font-mono text-slate-400">{o.id}</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${o.status === '已出貨' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.status}</span>
        </div>
        <div className="flex justify-between items-end">
            <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase tracking-wider">訂單內容</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{o.items[0]}</p></div>
            <div className="text-right space-y-1"><p className="text-[10px] text-slate-400 uppercase tracking-wider">總金額</p><span className="text-blue-600 dark:text-blue-400 font-bold text-xl">${o.total}</span></div>
        </div>
        {o.status === '待匯款' && !settings.enableOnlinePayment && (
            <button onClick={() => setIsBankInfoOpen(true)} className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all hover:bg-blue-100">查看匯款帳號</button>
        )}
    </div>
  ));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans transition-colors duration-300 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} settings={settings} />
      <main className="flex-1">
        {activeTab === Tab.PRODUCTS && renderProducts()}
        {activeTab === Tab.BRAND && renderBrand()}
        {activeTab === Tab.ORDERS && (
          <div className="pb-24 md:pb-8 pt-8 px-4 max-w-md mx-auto space-y-6 animate-fade-in text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">訂單查詢</h1>
              <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border dark:border-slate-800">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="輸入訂單編號或手機" className="flex-1 px-4 py-2 bg-transparent text-slate-900 dark:text-white focus:outline-none text-sm" />
                  <button onClick={handleSearchOrder} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg"><Icons.Search size={18} /></button>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-32 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                    ))
                ) : hasSearched ? renderOrderList(searchResult || []) : <div className="py-20 text-center text-slate-400 text-sm">輸入資料以查詢進度</div>}
              </div>
          </div>
        )}
        {activeTab === Tab.ADMIN && currentUser && <AdminPanel products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} settings={settings} setSettings={setSettings} onLogout={async () => { await logoutAdmin(); setActiveTab(Tab.PRODUCTS); }} />}
      </main>
      <BottomNav currentTab={activeTab} onTabChange={setActiveTab} />
      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onBuy={handleBuyNow} />}
      {isCheckoutOpen && selectedProduct && <CheckoutFlow product={selectedProduct} onClose={() => setIsCheckoutOpen(false)} onComplete={handleCheckoutComplete} settings={settings} />}
      {isBankInfoOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-sm relative">
                  <button onClick={() => setIsBankInfoOpen(false)} className="absolute top-4 right-4 text-slate-400"><Icons.Close /></button>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Icons.Card className="text-blue-600" /> 匯款資訊</h3>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border dark:border-slate-700">
                     <div><p className="text-[10px] text-slate-400 mb-1">銀行資訊</p><p className="font-bold text-slate-900 dark:text-white">{settings.bankName}</p></div>
                     <div><p className="text-[10px] text-slate-400 mb-1">匯款帳號</p><p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-2xl tracking-wide">{settings.bankAccount}</p></div>
                     <div><p className="text-[10px] text-slate-400 mb-1">戶名</p><p className="font-bold text-slate-800 dark:text-slate-200">{settings.bankAccountName}</p></div>
                  </div>
              </div>
          </div>
      )}
      {isAdminLoginOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm">
                  <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">管理者登入</h3>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                      <input name="email" type="email" placeholder="Email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none" required />
                      <input name="password" type="password" placeholder="密碼" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none" required />
                      {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setIsAdminLoginOpen(false)} className="flex-1 py-3 font-bold text-slate-400">取消</button>
                          <button type="submit" disabled={isLoggingIn} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">{isLoggingIn ? '登入中...' : '登入'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      <footer className="py-12 text-center text-slate-400 text-[10px] pb-24 md:pb-12"><p onClick={() => setIsAdminLoginOpen(true)} className="cursor-pointer">© {new Date().getFullYear()} 海鮮小劉 Seafood Liu. All Rights Reserved.</p></footer>
    </div>
  );
};

export default App;
