import React, { useState, useEffect, useRef } from 'react';
import { Product, StoreType, PaymentMethod, ShippingInfo, Order, SiteSettings } from '../types';
import { Icons } from './Icons';
import { createOrder } from '../services/firebaseService';

interface CheckoutFlowProps {
  product: Product;
  onClose: () => void;
  onComplete: (order: Order) => void;
  settings: SiteSettings;
}

// Mock Data for Stores
const MOCK_STORES = {
  [StoreType.SEVEN_ELEVEN]: [
    { name: '信義宏運門市', address: '台北市信義區信義路五段7號' },
    { name: '聯合報門市', address: '台北市信義區忠孝東路四段555號' },
    { name: '松捷門市', address: '台北市信義區忠孝東路五段1號' },
  ],
  [StoreType.FAMILY_MART]: [
    { name: '全家長春店', address: '台北市中山區長春路15號' },
    { name: '全家京華店', address: '台北市松山區八德路四段138號' },
    { name: '全家敦化店', address: '台北市大安區敦化南路一段100號' },
  ]
};

// Generic Logistics Components
const StorePickupLogo = ({ label, colorClass }: { label: string, colorClass: string }) => (
  <div className="flex flex-col items-center justify-center w-full h-full gap-2 pointer-events-none">
     <div className={`${colorClass} flex items-center justify-center`}>
        <Icons.Truck size={32} strokeWidth={1.5} />
     </div>
     <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
  </div>
);

// Payment Logos
const ApplePayLogo = () => (
    <div className="flex items-center gap-1">
        <svg viewBox="0 0 32 32" className="w-8 h-8 fill-current text-slate-900 dark:text-white">
            <path d="M22.8,19.3c-0.1-2.9,2.3-4.3,2.4-4.4c-1.3-1.9-3.4-2.2-4.1-2.2c-1.7-0.2-3.4,1-4.3,1c-0.9,0-2.2-1-3.6-1c-1.9,0-3.6,1.1-4.6,2.8c-1.9,3.4-0.5,8.3,1.4,11.1c0.9,1.4,2,2.9,3.4,2.8c1.4-0.1,1.9-0.9,3.6-0.9c1.7,0,2.1,0.9,3.6,0.9c1.5,0,2.4-1.3,3.3-2.6c1-1.5,1.5-3,1.5-3.1C25.4,23.8,22.8,22.2,22.8,19.3z M20,11c0.8-1,1.3-2.3,1.2-3.6c-1.1,0.1-2.5,0.7-3.3,1.7c-0.7,0.8-1.4,2.2-1.2,3.4C18,12.6,19.3,12,20,11z"/>
        </svg>
        <span className="font-bold text-lg tracking-tight font-sans text-slate-900 dark:text-white">Pay</span>
    </div>
);

const LinePayLogo = () => (
     <div className="flex items-center gap-1">
        <div className="w-8 h-8 rounded-lg bg-[#00C300] flex items-center justify-center text-white font-bold text-xs italic">
            LINE
        </div>
        <span className="font-bold text-lg tracking-tight text-[#00C300]">Pay</span>
     </div>
);

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ product, onClose, onComplete, settings }) => {
  const [step, setStep] = useState<number>(1);
  const [isSimulatingRedirect, setIsSimulatingRedirect] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string>('');
  
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapStoreType, setMapStoreType] = useState<StoreType | null>(null);

  const createdOrderRef = useRef<Order | null>(null);

  // Form State
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: '',
    phone: '',
    storeType: null, // No default selection
    storeName: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.APPLE_PAY);
  const [orderId, setOrderId] = useState('');

  // Validation State
  const [touched, setTouched] = useState({
      name: false,
      phone: false,
      store: false
  });

  // --- Scroll Lock Effect ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = '';
    };
  }, []);

  const isNameValid = shipping.name.trim().length > 0;
  const isPhoneValid = /^09\d{8}$/.test(shipping.phone);
  
  const isStoreSelected = settings.enableStoreIntegration 
    ? (shipping.storeName.length > 0 && shipping.storeType !== null)
    : (shipping.storeName.length > 0);

  const isStep1Valid = isNameValid && isPhoneValid && isStoreSelected;

  const handleBlur = (field: 'name' | 'phone' | 'store') => {
      setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleStoreTypeClick = (type: StoreType) => {
    setTouched(prev => ({ ...prev, store: true }));
    setMapStoreType(type);
    
    // Simulate Map Redirect
    setRedirectTarget('MAP');
    setIsSimulatingRedirect(true);
    
    setTimeout(() => {
        setIsSimulatingRedirect(false);
        setIsMapOpen(true);
    }, 1000);
  };

  const handleStoreSelect = (storeName: string) => {
      setShipping(prev => ({ 
          ...prev, 
          storeType: mapStoreType, 
          storeName: `${storeName} (冷凍)` 
      }));
      setIsMapOpen(false);
  };

  const handleReselectStore = () => {
      if (shipping.storeType) {
          handleStoreTypeClick(shipping.storeType);
      }
  };

  const handleNext = async () => {
    if (step === 1) {
        setTouched({ name: true, phone: true, store: true });
        if (!isStep1Valid) return;
        setStep(2);
    } else if (step === 2) {
        // Step 2 -> Step 3: Payment & Finalize
        if (settings.enableOnlinePayment) {
            setRedirectTarget('PAYMENT');
            setIsSimulatingRedirect(true);
            setTimeout(() => {
                setIsSimulatingRedirect(false);
                finalizeOrder(); 
            }, 2000);
        } else {
            finalizeOrder();
        }
    }
  };

  const finalizeOrder = async () => {
      // New Order ID Format: YYMMDD-XXX
      const dateObj = new Date();
      const yy = dateObj.getFullYear().toString().slice(-2);
      const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const dd = dateObj.getDate().toString().padStart(2, '0');
      const timestamp = dateObj.toLocaleString('zh-TW', { hour12: false });
      
      const randomSeq = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      const newOrderId = `${yy}${mm}${dd}-${randomSeq}`;
      
      setOrderId(newOrderId);
      
      // Determine initial status based on payment method
      const initialStatus = settings.enableOnlinePayment ? '商品處理中' : '待匯款';

      const newOrder: Order = {
          id: newOrderId,
          customerName: shipping.name,
          customerPhone: shipping.phone,
          date: timestamp,
          lastUpdated: timestamp,
          total: product.price,
          status: initialStatus,
          items: [product.title]
      };
      createdOrderRef.current = newOrder;

      // --- FIREBASE INTEGRATION ---
      try {
          await createOrder(newOrder); // Save to cloud
      } catch (e) {
          console.error("Failed to save order to cloud", e);
          // We continue to show success, but in a real app you might want to show an error
      }

      setStep(3); 
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      alert('已複製到剪貼簿！');
  };

  const handleShareWebsite = async () => {
      const shareData = {
          title: '海鮮小劉 - 頂級海鮮禮盒',
          text: '我發現這家海鮮超新鮮！推薦給你！',
          url: window.location.origin
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Error sharing:', err);
          }
      } else {
          navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
          alert('連結已複製！請分享給好友 (Line/Instagram)');
      }
  };

  const handleSafeClose = () => {
      if (step === 3 && createdOrderRef.current) {
          onComplete(createdOrderRef.current);
      } else {
          onClose();
      }
  };

  const handleCompleteFlow = () => {
      if (createdOrderRef.current) {
          onComplete(createdOrderRef.current);
      }
  };

  // --- Render Functions ---

  // Map Selection Simulation
  if (isMapOpen && mapStoreType) {
      const stores = MOCK_STORES[mapStoreType];
      const isSeven = mapStoreType === StoreType.SEVEN_ELEVEN;
      const headerColor = isSeven ? 'bg-green-600' : 'bg-blue-600';
      const logoText = isSeven ? '7-ELEVEN 電子地圖' : 'FamilyMart 電子地圖';

      return (
        <div className="fixed inset-0 bg-white z-[70] flex flex-col animate-fade-in">
            {/* Fake Browser Header */}
            <div className={`${headerColor} text-white p-4 flex items-center justify-between shadow-md`}>
                <div className="flex items-center gap-2">
                    <Icons.Map size={20} />
                    <span className="font-bold">{logoText}</span>
                </div>
                <button onClick={() => setIsMapOpen(false)} className="bg-black/20 p-2 rounded-full hover:bg-black/30">
                    <Icons.Close size={20} />
                </button>
            </div>
            
            {/* Fake Search Bar */}
            <div className="p-4 bg-slate-100 border-b border-slate-200">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="請輸入街道名稱或門市店號" 
                        className="flex-1 p-2 rounded border border-slate-300 text-sm" 
                    />
                    <button className={`${headerColor} text-white px-4 py-2 rounded text-sm font-bold`}>搜尋</button>
                </div>
            </div>

            {/* Store List */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3">
                <p className="text-xs text-slate-500 mb-2">搜尋結果：台北市</p>
                {stores.map((store, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                        <div>
                            <p className={`font-bold ${isSeven ? 'text-green-700' : 'text-blue-700'}`}>{store.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{store.address}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200">
                                24H 營業
                            </span>
                        </div>
                        <button 
                            onClick={() => handleStoreSelect(store.name)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-sm active:scale-95 transition-transform ${isSeven ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            選擇
                        </button>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // Loading Simulation
  if (isSimulatingRedirect) {
      return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl flex flex-col items-center gap-4 shadow-2xl w-full max-w-sm text-center">
                <Icons.Loading className="animate-spin text-green-600" size={48} />
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                        {redirectTarget === 'MAP' ? '正在連接物流平台...' : '正在連接綠界金流...'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {redirectTarget === 'MAP' ? '即將開啟門市選擇地圖' : '安全加密連線中，請勿關閉視窗'}
                    </p>
                </div>
            </div>
        </div>
      );
  }

  const renderStep1 = () => (
    <div className="space-y-8 animate-fade-in text-left">
        {/* Recipient Info */}
        <div className="space-y-4">
             <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                取貨資訊
             </h4>
             <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">姓名 (取貨時須核對證件)</label>
                        {touched.name && !isNameValid && <span className="text-xs text-red-500 flex items-center gap-1"><Icons.Alert size={10}/> 請輸入姓名</span>}
                    </div>
                    <input 
                        type="text" 
                        value={shipping.name}
                        onChange={(e) => setShipping({...shipping, name: e.target.value})}
                        onBlur={() => handleBlur('name')}
                        placeholder="請輸入證件姓名"
                        className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 transition-all shadow-sm ${
                            touched.name && !isNameValid 
                            ? 'border-red-400 ring-red-100 dark:ring-red-900/30 text-red-900' 
                            : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 text-slate-900 dark:text-white'
                        }`}
                    />
                 </div>
                 
                 <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">手機號碼</label>
                        {touched.phone && !isPhoneValid && <span className="text-xs text-red-500 flex items-center gap-1"><Icons.Alert size={10}/> 格式錯誤 (09xx...)</span>}
                    </div>
                    <input 
                        type="tel" 
                        value={shipping.phone}
                        onChange={(e) => setShipping({...shipping, phone: e.target.value})}
                        onBlur={() => handleBlur('phone')}
                        placeholder="09xx-xxx-xxx"
                        maxLength={10}
                        className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 transition-all shadow-sm ${
                            touched.phone && !isPhoneValid
                            ? 'border-red-400 ring-red-100 dark:ring-red-900/30 text-red-900'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 text-slate-900 dark:text-white'
                        }`}
                    />
                 </div>
            </div>
        </div>

        {/* Store Selection */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    選擇冷凍取貨門市
                </h4>
                {touched.store && !isStoreSelected && (
                    <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse">
                        <Icons.Alert size={12}/> 請點擊選擇
                    </span>
                )}
            </div>
            
            {settings.enableStoreIntegration ? (
                // Active: Integrated Map Selection
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleStoreTypeClick(StoreType.SEVEN_ELEVEN)}
                            className={`h-24 rounded-xl border-2 relative overflow-hidden transition-all group ${
                                shipping.storeType === StoreType.SEVEN_ELEVEN 
                                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 ring-2 ring-green-500/20 shadow-md' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                            }`}
                        >
                            <StorePickupLogo label="7-ELEVEN" colorClass="text-green-600 dark:text-green-400" />
                            {shipping.storeType === StoreType.SEVEN_ELEVEN && (
                                <div className="absolute top-2 right-2 text-green-500 bg-white rounded-full">
                                    <Icons.Check size={16} strokeWidth={3} />
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => handleStoreTypeClick(StoreType.FAMILY_MART)}
                            className={`h-24 rounded-xl border-2 relative overflow-hidden transition-all group ${
                                shipping.storeType === StoreType.FAMILY_MART
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20 shadow-md' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                            }`}
                        >
                            <StorePickupLogo label="全家便利商店" colorClass="text-blue-600 dark:text-blue-400" />
                            {shipping.storeType === StoreType.FAMILY_MART && (
                                <div className="absolute top-2 right-2 text-blue-500 bg-white rounded-full">
                                    <Icons.Check size={16} strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    </div>
                    {/* Selected Store Display */}
                    {shipping.storeName && (
                        <div className="animate-fade-in mt-4 p-4 bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                                    <Icons.Store size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">已選擇門市</p>
                                    <p className="font-bold text-slate-900 dark:text-white">{shipping.storeName}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleReselectStore}
                                className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                重新選擇
                            </button>
                        </div>
                    )}
                </>
            ) : (
                // Inactive: Card with Link + Manual Input
                <div className="space-y-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                         <div className="flex items-start gap-3">
                             <Icons.Info className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                             <div className="space-y-2">
                                 <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                     {settings.storeFallbackMessage || '請使用下方連結查詢7-11門市，並將「門市名稱」與「店號」填寫於下方欄位。'}
                                 </p>
                                 <a 
                                    href={settings.storeLookupLink || '#'} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                 >
                                    前往查詢門市 <Icons.ExternalLink size={14} />
                                 </a>
                             </div>
                         </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">填寫取貨門市 (7-11 門市名稱、店號)</label>
                        <input 
                            type="text" 
                            value={shipping.storeName}
                            onChange={(e) => setShipping({...shipping, storeName: e.target.value})}
                            onBlur={() => handleBlur('store')}
                            placeholder="例如：永吉門市（店號：252975）"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in text-left">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            訂單明細與付款
        </h4>
        
        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex gap-4 items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-lg object-cover" />
                <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{product.title}</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400">數量: 1</p>
                </div>
            </div>

            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>商品小計</span>
                <span>${product.price}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>冷凍運費</span>
                <span>$160</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                <span>滿額免運優惠</span>
                <span>-$160</span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                <span className="text-slate-900 dark:text-white font-bold">應付金額</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${product.price}</span>
            </div>
        </div>

        <div className="space-y-3">
             <label className="text-sm font-medium text-slate-600 dark:text-slate-400">付款方式</label>
             
             {settings.enableOnlinePayment ? (
                 // Active: Online Payment Buttons
                 <>
                    <button
                        onClick={() => setPaymentMethod(PaymentMethod.APPLE_PAY)}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                            paymentMethod === PaymentMethod.APPLE_PAY
                            ? 'border-slate-900 dark:border-slate-400 bg-slate-50 dark:bg-slate-800' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                        }`}
                    >
                        <ApplePayLogo />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === PaymentMethod.APPLE_PAY ? 'border-slate-900 dark:border-white' : 'border-slate-300'
                        }`}>
                            {paymentMethod === PaymentMethod.APPLE_PAY && <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />}
                        </div>
                    </button>

                    <button
                        onClick={() => setPaymentMethod(PaymentMethod.LINE_PAY)}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                            paymentMethod === PaymentMethod.LINE_PAY
                            ? 'border-[#00C300] bg-green-50 dark:bg-green-900/10' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                        }`}
                    >
                        <LinePayLogo />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === PaymentMethod.LINE_PAY ? 'border-[#00C300]' : 'border-slate-300'
                        }`}>
                            {paymentMethod === PaymentMethod.LINE_PAY && <div className="w-2.5 h-2.5 rounded-full bg-[#00C300]" />}
                        </div>
                    </button>
                 </>
             ) : (
                 // Inactive: Structured Bank Info Card WITHOUT Warnings
                 <>
                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl space-y-4">
                         <div className="flex justify-between items-center">
                             <span className="text-sm font-bold text-slate-500 dark:text-slate-400">匯款資訊</span>
                             <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">ATM / 網銀轉帳</span>
                         </div>
                         
                         <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">銀行代碼 / 名稱</p>
                                <p className="font-bold text-slate-900 dark:text-white text-lg">{settings.bankName}</p>
                            </div>
                            
                            <div>
                                <p className="text-xs text-slate-500 mb-1">匯款帳號</p>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-2xl tracking-wide">
                                        {settings.bankAccount}
                                    </p>
                                    <button 
                                        onClick={() => handleCopy(settings.bankAccount)}
                                        className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                                        title="複製帳號"
                                    >
                                        <Icons.Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                 <p className="text-xs text-slate-500 mb-1">戶名</p>
                                 <p className="font-medium text-slate-900 dark:text-white">{settings.bankAccountName}</p>
                            </div>
                         </div>
                     </div>

                     {/* Merged Warning Block Outside Card */}
                     <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex gap-3">
                         <div className="text-2xl flex-shrink-0">👾</div>
                         <div>
                             <p className="text-sm font-bold text-orange-800 dark:text-orange-200 mb-1">匯款小叮嚀</p>
                             <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1 list-disc pl-3">
                                 <li>請於 <span className="font-bold underline">2日內</span> 完成匯款，逾期將取消訂單。</li>
                                 <li>轉帳後請保留明細，並告知客服<span className="font-bold">帳號末五碼</span>以利對帳。</li>
                             </ul>
                         </div>
                     </div>
                 </>
             )}
        </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col items-center justify-center py-6 animate-fade-in text-center w-full">
         <div className="relative mb-6">
             <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
             <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 relative z-10">
                 <Icons.Check size={40} />
             </div>
         </div>
         <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">訂購成功！</h3>
         <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
             感謝您的購買，我們將盡快為您出貨。
         </p>

         {!settings.enableOnlinePayment && (
            <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-4 py-3 rounded-xl text-sm font-bold border border-orange-100 dark:border-orange-900/30 inline-block shadow-sm">
                👾 貼心小怪獸提醒：請記得於 2 日內完成匯款以保留訂單
            </div>
         )}
         
         <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl w-full flex items-center justify-between mb-6 border border-slate-200 dark:border-slate-700">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-left mb-1">訂單編號</p>
                <p className="font-mono font-bold text-slate-800 dark:text-white tracking-wider">{orderId}</p>
            </div>
            <button 
                onClick={() => handleCopy(orderId)}
                className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-sm"
                title="複製單號"
            >
                <Icons.Copy size={18} />
            </button>
         </div>

         <div className="flex flex-col gap-3 w-full">
             {/* Main Action: Add Line */}
             <a 
                href="https://line.me/R/ti/p/@110zazyo"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#00C300] hover:bg-[#00B300] text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[#00C300] font-bold text-xs italic pr-0.5">L</span>
                </div>
                加入海鮮小劉 LINE 官方帳號
             </a>

             {/* Secondary: Check Order */}
             <button 
                onClick={handleCompleteFlow} // Navigates to Orders tab via App callback
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Icons.Order size={18} />
                前往訂單查詢
             </button>

             {/* Tertiary: Share */}
             <button 
                onClick={handleShareWebsite}
                className="w-full text-slate-400 dark:text-slate-500 font-bold py-2 rounded-xl hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
             >
                <Icons.Share size={16} />
                分享網站給朋友
             </button>
         </div>
    </div>
  );

  // Determine progress bar width
  const progressWidth = step === 1 ? '33%' : step === 2 ? '66%' : '100%';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-300 relative overflow-hidden">
        
        {/* Progress Bar */}
        {step < 3 && (
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
                <div 
                    className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                    style={{ width: progressWidth }}
                ></div>
            </div>
        )}

        {/* Unified Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 sticky top-0">
            <div className="flex items-center gap-3 text-slate-800 dark:text-white">
                {step < 3 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        {step === 1 ? <Icons.Truck size={20} /> : <Icons.Card size={20} />}
                    </div>
                )}
                <div>
                    <h2 className="font-bold text-lg leading-tight">
                        {step === 1 ? '填寫配送資料' : step === 2 ? '確認付款' : '訂單完成'}
                    </h2>
                    {step < 3 && <p className="text-[10px] text-slate-400 font-bold tracking-wider">STEP {step} OF 2</p>}
                </div>
            </div>
            {/* Allow close on any step now, but usually hide close on success screen to encourage action buttons */}
            <button onClick={handleSafeClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Icons.Close size={24} />
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>

        {/* Footer Actions */}
        {step < 3 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sm:rounded-b-2xl pb-safe">
                {/* Help hint if disabled */}
                {step === 1 && !isStep1Valid && touched.name && (
                    <div className="mb-3 flex items-center justify-center gap-2 text-red-500 text-xs font-medium animate-pulse">
                        <Icons.Alert size={12} />
                        <span>請填寫完整收件資訊</span>
                    </div>
                )}

                <button
                    onClick={handleNext}
                    disabled={step === 1 && !isStep1Valid}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        (step === 1 && !isStep1Valid)
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/30 active:scale-[0.98]'
                    }`}
                >
                    {step === 1 ? '下一步' : settings.enableOnlinePayment ? `確認支付 $${product.price}` : `送出訂單 $${product.price}`}
                    {step === 1 && <Icons.Next size={20} />}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutFlow;
