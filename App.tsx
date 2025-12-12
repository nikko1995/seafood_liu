
import React, { useState, useEffect } from 'react';
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
  
  // Auth State (目前的登入者) - 使用 any 避免型別錯誤
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // Default Settings
  const [settings, setSettings] = useState<SiteSettings>({
    enableStoreIntegration: false,
    storeFallbackMessage: '請使用下方連結查詢門市，並將「門市名稱」與「店號」填寫於下方欄位。',
    storeLookupLink: 'https://emap.presco.com.tw/c2cemap.ashx',
    enableOnlinePayment: false,
    bankName: '822 中國信託',
    bankAccount: '123-456-78900',
    bankAccountName: '海鮮小劉',
    lastUpdated: new Date().toLocaleString('zh-TW', { hour12: false })
  });

  // --- Initial Data Fetching ---
  useEffect(() => {
    // 1. 監聽登入狀態改變
    const unsubscribe = subscribeToAuth((user) => {
        setCurrentUser(user);
        // 如果使用者登出，且當前在後台頁面，強制踢回首頁
        if (!user && activeTab === Tab.ADMIN) {
            setActiveTab(Tab.PRODUCTS);
        }
    });

    // 2. Load Data
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedProducts, fetchedOrders, fetchedSettings] = await Promise.all([
                fetchProducts(),
                fetchOrders(),
                fetchSettings()
            ]);

            if (fetchedProducts.length > 0) setProducts(fetchedProducts);
            if (fetchedOrders.length > 0) setOrders(fetchedOrders);
            if (fetchedSettings) {
                setSettings(prev => ({ ...prev, ...fetchedSettings }));
            }
            
        } catch (error) {
            console.error("Failed to load app data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    loadData();
    return () => unsubscribe();
  }, [activeTab]);

  // Search State
  const [searchType, setSearchType] = useState<'id' | 'phone'>('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Order[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin Login State
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleOpenDetail = (product: Product) => {
    setDetailProduct(product);
  };

  const handleBuyNow = (product: Product) => {
    setDetailProduct(null);
    setSelectedProduct(product);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutComplete = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setIsCheckoutOpen(false);
    setActiveTab(Tab.ORDERS);
    setHasSearched(false);
    setSearchResult(null);
    setSearchQuery(''); 
  };

  const handleSearchOrder = () => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    const results = orders.filter(order => {
        if (searchType === 'id') {
            return order.id.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
            return order.customerPhone.includes(searchQuery);
        }
    });
    setSearchResult(results);
  };

  const handleSecretEntry = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // 判斷邏輯：如果已登入，直接進後台；如果沒登入，開登入框
      if (currentUser) {
          setActiveTab(Tab.ADMIN);
      } else {
          setIsAdminLoginOpen(true);
      }
  };

  // 處理真實的 Firebase 登入
  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      setLoginError('');
      setIsLoggingIn(true);

      try {
          await loginAdmin(email, password); // 呼叫 Firebase
          setIsAdminLoginOpen(false);
          setActiveTab(Tab.ADMIN);
      } catch (error: any) {
          console.error("Login failed", error);
          if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             setLoginError('帳號或密碼錯誤');
          } else if (error.code === 'auth/too-many-requests') {
             setLoginError('嘗試失敗太多次，請稍後再試');
          } else {
             setLoginError('登入失敗，請檢查網路');
          }
      } finally {
          setIsLoggingIn(false);
      }
  };

  const handleAdminLogout = async () => {
      await logoutAdmin();
      setActiveTab(Tab.PRODUCTS);
  };

  const renderBadge = (text: string) => {
      if (text.includes('熱銷')) {
          return (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                <Icons.Flame size={14} fill="currentColor" />
                {text}
            </div>
          );
      }
      if (text.includes('限定')) {
          return (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                <Icons.Gift size={14} />
                {text}
            </div>
          );
      }
      return (
        <div className="absolute top-3 left-3 bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
            {text}
        </div>
      );
  };

  const renderProducts = () => (
    <div className="pb-24 md:pb-8 px-4 max-w-6xl mx-auto animate-fade-in">
      <div className="py-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center">
              來自大海的極致鮮甜 
              <button 
                onClick={handleSecretEntry}
                className="text-2xl ml-2 cursor-pointer select-none hover:scale-125 active:scale-95 transition-transform focus:outline-none"
                title={currentUser ? "進入後台" : "管理員登入"} 
              >
                🌊
              </button>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium">今天下單，明天享受頂級海味！</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
            <Icons.Loading className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.filter(p => p.isActive !== false).map((product) => (
            <div 
                key={product.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group flex flex-col h-full hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => handleOpenDetail(product)} 
            >
                <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img 
                    src={product.images[0]} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {product.badge && renderBadge(product.badge)}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{product.title}</h3>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">${product.price}</span>
                </div>
                
                <ul className="space-y-1.5 mb-4 flex-1">
                    {product.description.slice(0, 3).map((item, idx) => ( 
                    <li key={idx} className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <span className="w-1 h-1 bg-blue-300 dark:bg-blue-600 rounded-full mr-2 flex-shrink-0" />
                        {item}
                    </li>
                    ))}
                </ul>

                <button 
                    onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-auto text-sm"
                >
                    <Icons.Product size={16} />
                    直接購買
                </button>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderBrand = () => (
    <div className="pb-24 md:pb-8 pt-4 max-w-2xl mx-auto text-center animate-fade-in">
        <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative shadow-lg mx-4 md:mx-0">
             <img 
                src="https://images.unsplash.com/photo-1534483509719-3feaee7c30da?q=80&w=1200&auto=format&fit=crop" 
                alt="大溪漁港" 
                className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col">
                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">來自大溪漁港的堅持</h2>
                <div className="w-16 h-1 bg-blue-500 rounded-full"></div>
             </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-left space-y-6 mx-4 md:mx-0">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
                    <Icons.Fish size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">漁港攤販起家，傳承三代</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                        我們從小在宜蘭大溪漁港長大，看著父執輩在波濤中討生活。從一個小小的魚攤，到現在希望透過網路，將這份最新鮮的美味，零時差送到您的餐桌。
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 flex-shrink-0">
                    <Icons.Truck size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">每日清晨現流，新鮮販售</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                        堅持不賣隔夜貨！每天清晨漁船進港，我們第一時間精選最優質的漁獲，立即進行低溫處理與真空包裝，鎖住大海最原始的鮮甜。
                    </p>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-8 text-slate-400 dark:text-slate-500">
                <div className="flex flex-col items-center gap-2">
                    <Icons.Map size={24} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-bold">大溪直送</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <Icons.Check size={24} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-bold">品質保證</span>
                </div>
                <div className="flex flex-col items-center gap-2 relative">
                    <Icons.Truck size={24} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-bold">低溫宅配</span>
                </div>
            </div>
        </div>
    </div>
  );

  const renderOrderList = (orders: Order[]) => {
      if (orders.length === 0) {
          return (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <Icons.Order size={24} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">查無訂單資料</p>
              </div>
          );
      }
      return orders.map((order) => (
        <div key={order.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3 border-b border-slate-50 dark:border-slate-800 pb-3">
                <span className="text-xs font-mono text-slate-400">{order.id}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === '已完成' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : order.status === '已出貨'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : order.status === '已取消'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                }`}>
                    {order.status}
                </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                <div>
                    <span className="text-xs text-slate-400 block mb-0.5">訂購日期</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{order.date}</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-0.5">訂購人</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{order.customerName}</span>
                </div>
                <div>
                    <span className="text-xs text-slate-400 block mb-0.5">手機號碼</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{order.customerPhone}</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-0.5">訂單金額</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">${order.total}</span>
                </div>
            </div>

            <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">購買項目</p>
                {order.items.map((item, i) => (
                    <p key={i} className="text-slate-700 dark:text-slate-300 font-medium text-sm">{item}</p>
                ))}
            </div>
        </div>
    ));
  };

  const renderOrders = () => (
    <div className="pb-24 md:pb-8 pt-8 px-4 max-w-md mx-auto space-y-6 animate-fade-in">
        <header>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">訂單查詢</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">請輸入資訊查詢您的歷史訂單</p>
        </header>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button 
                    onClick={() => { setSearchType('id'); setHasSearched(false); setSearchQuery(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        searchType === 'id' 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    訂單編號
                </button>
                <button 
                    onClick={() => { setSearchType('phone'); setHasSearched(false); setSearchQuery(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        searchType === 'phone' 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    手機號碼
                </button>
            </div>
            
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchType === 'id' ? "輸入訂單編號" : "輸入手機號碼"}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                    onClick={handleSearchOrder}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors"
                >
                    <Icons.Search size={20} />
                </button>
            </div>
        </div>

        <div className="space-y-4">
            {hasSearched ? (
                <>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        查詢結果
                    </h3>
                    {renderOrderList(searchResult || [])}
                </>
            ) : (
                <div className="text-center py-8">
                     <p className="text-slate-400 text-sm">請輸入查詢條件以顯示訂單</p>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main>
        {activeTab === Tab.PRODUCTS && renderProducts()}
        {activeTab === Tab.BRAND && renderBrand()}
        {activeTab === Tab.ORDERS && renderOrders()}
        {activeTab === Tab.ADMIN && currentUser && (
            <AdminPanel 
                products={products} 
                setProducts={setProducts} 
                orders={orders} 
                setOrders={setOrders}
                settings={settings}
                setSettings={setSettings}
                onLogout={handleAdminLogout}
            />
        )}
      </main>

      <BottomNav currentTab={activeTab} onTabChange={setActiveTab} />

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onBuy={handleBuyNow}
        />
      )}

      {isCheckoutOpen && selectedProduct && (
        <CheckoutFlow 
            product={selectedProduct} 
            onClose={() => setIsCheckoutOpen(false)}
            onComplete={handleCheckoutComplete}
            settings={settings}
        />
      )}

      {isAdminLoginOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Icons.Settings size={20} /> 管理員登入 (Firebase)
                  </h3>
                  <form onSubmit={handleAdminLogin}>
                      <div className="space-y-3 mb-4">
                          <input 
                              name="email"
                              type="email" 
                              autoFocus
                              placeholder="管理員 Email"
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                              required
                          />
                          <input 
                              name="password"
                              type="password" 
                              placeholder="密碼"
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                              required
                          />
                      </div>
                      
                      {loginError && (
                          <p className="text-red-500 text-xs font-bold mb-3 flex items-center gap-1">
                              <Icons.Alert size={12}/> {loginError}
                          </p>
                      )}

                      <div className="flex gap-3">
                          <button 
                              type="button" 
                              onClick={() => setIsAdminLoginOpen(false)}
                              className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                              取消
                          </button>
                          <button 
                              type="submit"
                              disabled={isLoggingIn}
                              className="flex-1 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-colors disabled:opacity-50 flex justify-center items-center"
                          >
                              {isLoggingIn ? <Icons.Loading className="animate-spin" size={20} /> : '登入'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
