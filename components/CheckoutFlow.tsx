
import React, { useState, useEffect, useRef } from 'react';
import { Product, StoreType, PaymentMethod, ShippingInfo, Order, SiteSettings, DeliveryTimeSlot } from '../types';
import { Icons } from './Icons';
import { createOrder } from '../services/firebaseService';
import { sendTelegramNotification } from '../services/telegramService';

interface CheckoutFlowProps {
  product: Product;
  onClose: () => void;
  onComplete: (order: Order) => void;
  settings: SiteSettings;
}

// Taiwan Administrative Divisions
const TAIWAN_AREAS: { [key: string]: string[] } = {
  '台北市': ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
  '新北市': ['板橋區', '新莊區', '中和區', '永和區', '土城區', '樹林區', '三峽區', '鶯歌區', '三重區', '蘆洲區', '五股區', '泰山區', '林口區', '八里區', '淡水區', '三芝區', '石門區', '汐止區', '瑞芳區', '貢寮區', '平溪區', '雙溪區', '新店區', '深坑區', '石碇區', '坪林區', '烏來區'],
  '基隆市': ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區'],
  '桃園市': ['桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區'],
  '新竹市': ['東區', '北區', '香山區'],
  '新竹縣': ['竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉', '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉'],
  '苗栗縣': ['苗栗市', '頭份市', '苑裡鎮', '通霄鎮', '竹南鎮', '後龍鎮', '卓蘭鎮', '大湖鄉', '公館鄉', '銅鑼鄉', '南庄鄉', '頭屋鄉', '三義鄉', '西湖鄉', '造橋鄉', '三灣鄉', '獅潭鄉', '泰安鄉'],
  '台中市': ['中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區', '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區', '后里區', '石岡區', '東勢區', '和平區', '新社區', '潭子區', '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區', '清水區', '大甲區', '外埔區', '大安區'],
  '彰化縣': ['彰化市', '員林市', '和美鎮', '鹿港鎮', '溪湖鎮', '二林鎮', '田中鎮', '北斗鎮', '花壇鄉', '芬園鄉', '大村鄉', '埔心鄉', '永靖鄉', '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉', '竹塘鄉', '溪州鄉', '秀水鄉', '伸港鄉', '福興鄉', '線西鄉', '埔鹽鄉'],
  '南投縣': ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉'],
  '雲林縣': ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '古坑鄉', '大埤鄉', '莿桐鄉', '林內鄉', '二崙鄉', '崙背鄉', '麥寮鄉', '東勢鄉', '褒忠鄉', '臺西鄉', '元長鄉', '四湖鄉', '口湖鄉', '水林鄉'],
  '嘉義市': ['東區', '西區'],
  '嘉義縣': ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉', '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉', '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉'],
  '台南市': ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'],
  '高雄市': ['楠梓區', '左營區', '鼓山區', '三民區', '鹽埕區', '前金區', '新興區', '苓雅區', '前鎮區', '旗津區', '小港區', '鳳山區', '林園區', '大寮區', '大樹區', '大社區', '仁武區', '鳥松區', '岡山區', '橋頭區', '燕巢區', '田寮區', '阿蓮區', '路竹區', '湖內區', '茄萣區', '永安區', '彌陀區', '梓官區', '旗山區', '美濃區', '六龜區', '甲仙區', '杉林區', '內門區', '茂林區', '桃源區', '那瑪夏區'],
  '屏東縣': ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉', '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉', '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉', '枋山鄉', '三地門鄉', '霧臺鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉'],
  '宜蘭縣': ['宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '冬山鄉', '五結鄉', '三星鄉', '大同鄉', '南澳鄉'],
  '花蓮縣': ['花蓮市', '鳳林鎮', '玉里鎮', '新城鄉', '吉安鄉', '壽豐鄉', '光復鄉', '豐濱鄉', '瑞穗鄉', '富里鄉', '秀林鄉', '萬榮鄉', '卓溪鄉'],
  '台東縣': ['台東市', '成功鎮', '關山鎮', '卑南鄉', '大武鄉', '太麻里鄉', '東河鄉', '長濱鄉', '鹿野鄉', '池上鄉', '綠島鄉', '延平鄉', '海端鄉', '達仁鄉', '金峰鄉', '蘭嶼鄉'],
  '澎湖縣': ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'],
  '金門縣': ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉'],
  '連江縣': ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉']
};

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
  const [isSubmitting, setIsSubmitting] = useState(false); // New: 防止重複提交
  
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapStoreType, setMapStoreType] = useState<StoreType | null>(null);

  const createdOrderRef = useRef<Order | null>(null);

  // Check Category
  const isDelivery = product.category === 'delivery';

  // Form State
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: '',
    phone: '',
    alternativePhone: '',
    storeType: null, 
    storeName: '',
    city: '台北市',
    district: TAIWAN_AREAS['台北市'][0],
    address: '',
    timeSlot: DeliveryTimeSlot.UNSPECIFIED
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.APPLE_PAY);
  const [orderId, setOrderId] = useState('');

  // Update districts when city changes
  useEffect(() => {
    if (shipping.city && TAIWAN_AREAS[shipping.city]) {
        // If current district is not in new city's list, reset it
        const newDistricts = TAIWAN_AREAS[shipping.city];
        if (!shipping.district || !newDistricts.includes(shipping.district)) {
            setShipping(prev => ({ ...prev, district: newDistricts[0] }));
        }
    }
  }, [shipping.city]);

  // Validation State
  const [touched, setTouched] = useState({
      name: false,
      phone: false,
      store: false,
      address: false
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
  
  // Validation based on Delivery Type
  const isStoreSelected = isDelivery 
    ? false // Not needed for delivery
    : settings.enableStoreIntegration 
        ? (shipping.storeName.length > 0 && shipping.storeType !== null)
        : (shipping.storeName.length > 0);
  
  const isAddressValid = isDelivery
    ? (shipping.address?.trim().length || 0) > 0 && !!shipping.city && !!shipping.district
    : true;

  const isStep1Valid = isDelivery 
    ? (isNameValid && isPhoneValid && isAddressValid)
    : (isNameValid && isPhoneValid && isStoreSelected);

  const handleBlur = (field: 'name' | 'phone' | 'store' | 'address') => {
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
        setTouched({ name: true, phone: true, store: true, address: true });
        if (!isStep1Valid) return;
        setStep(2);
    } else if (step === 2) {
        if (isSubmitting) return; // Prevent double click

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
      if (isSubmitting) return; // Double check
      setIsSubmitting(true);

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

      // Construct Address String safely
      let fullAddress = '';
      if (isDelivery) {
          fullAddress = `${shipping.city}${shipping.district}${shipping.address}`;
      } else {
          // Fallback for store type if null (Manual Input case)
          const typeStr = shipping.storeType === StoreType.MANUAL_INPUT ? '手動輸入' : (shipping.storeType || '門市取貨');
          fullAddress = `${shipping.storeName} (${typeStr})`;
      }

      const newOrder: Order = {
          id: newOrderId,
          customerName: shipping.name,
          customerPhone: shipping.phone, // Primary mobile
          date: timestamp,
          lastUpdated: timestamp,
          total: product.price,
          status: initialStatus,
          items: [product.title],
          // Delivery Details
          shippingType: isDelivery ? 'delivery' : 'store',
          shippingAddress: fullAddress + (isDelivery && shipping.alternativePhone ? ` (備用: ${shipping.alternativePhone})` : ''),
          // FIX: Firestore 不支援 undefined，如果是超取，就不要傳 deliveryTimeSlot 這個欄位
          ...(isDelivery ? { deliveryTimeSlot: shipping.timeSlot } : {})
      };
      createdOrderRef.current = newOrder;

      // 1. Try to save to Cloud (Firebase)
      try {
          await createOrder(newOrder); 
      } catch (e) {
          console.error("Failed to save order to cloud", e);
          // Don't block the UI, user can still see the success screen
      }

      // 2. Try to send Telegram Notification (Independent of Cloud Save)
      // This ensures even if Firebase rules fail, the admin gets a message
      if (settings.telegramBotToken && settings.telegramChatId) {
         try {
             const message = `
<b>📦 新訂單通知！</b>

<b>單號：</b> ${newOrderId}
<b>商品：</b> ${product.title}
<b>金額：</b> $${product.price}
<b>顧客：</b> ${shipping.name}
<b>電話：</b> ${shipping.phone}
<b>狀態：</b> ${initialStatus}
<b>配送：</b> ${isDelivery ? '黑貓宅配' : '超商取貨'}
<b>地址/門市：</b> ${fullAddress}
             `;
             await sendTelegramNotification(settings.telegramBotToken, settings.telegramChatId, message);
         } catch (e) {
             console.error("Failed to send Telegram", e);
         }
      }

      setStep(3); 
      setIsSubmitting(false); // Release lock (though step 3 UI doesn't allow resubmit)
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
                 
                 {/* Phone Number Logic */}
                 {isDelivery ? (
                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <div className="flex justify-between">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">手機號碼 1 (必填)</label>
                                {touched.phone && !isPhoneValid && <span className="text-xs text-red-500 flex items-center gap-1"><Icons.Alert size={10}/> 格式錯誤</span>}
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
                         <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">家電或手機 2 (選填)</label>
                            <input 
                                type="tel" 
                                value={shipping.alternativePhone}
                                onChange={(e) => setShipping({...shipping, alternativePhone: e.target.value})}
                                placeholder="備用聯絡電話"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-sm"
                            />
                         </div>
                         <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                             <Icons.Info size={12} /> 請至少填寫一組有效的手機號碼以便接收物流通知。
                         </div>
                     </div>
                 ) : (
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
                 )}
            </div>
        </div>

        {/* Store Selection OR Delivery Address */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    {isDelivery ? '宅配資訊' : '選擇冷凍取貨門市'}
                </h4>
                {!isDelivery && touched.store && !isStoreSelected && (
                    <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse">
                        <Icons.Alert size={12}/> 請點擊選擇
                    </span>
                )}
                {isDelivery && touched.address && !isAddressValid && (
                     <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse">
                        <Icons.Alert size={12}/> 請完整填寫地址
                    </span>
                )}
            </div>
            
            {isDelivery ? (
                // --- Delivery Form ---
                <div className="space-y-4 animate-fade-in">
                    {/* Black Cat Info */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-sm relative overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="relative z-10 flex gap-3">
                             <div className="w-10 h-10 bg-[#FEC401] text-black rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                                 <Icons.Truck size={24} />
                             </div>
                             <div>
                                 <h5 className="font-bold text-slate-900 dark:text-[#FEC401] text-sm">黑貓宅急便 - 低溫冷凍宅配</h5>
                                 <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                     全程低溫-15度C 以下配送，確保海鮮新鮮度不流失。
                                 </p>
                             </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#FEC401]/10 rounded-full blur-xl"></div>
                    </div>

                    {/* Address Fields */}
                    <div className="space-y-3">
                         <div className="flex gap-3">
                             <div className="w-1/3">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">縣市</label>
                                <div className="relative">
                                    <select 
                                        value={shipping.city}
                                        onChange={(e) => setShipping({...shipping, city: e.target.value})}
                                        className="w-full appearance-none px-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                    >
                                        {Object.keys(TAIWAN_AREAS).map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                    <Icons.ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={12} />
                                </div>
                             </div>
                             <div className="w-2/3">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">鄉鎮市區</label>
                                <div className="relative">
                                    <select 
                                        value={shipping.district}
                                        onChange={(e) => setShipping({...shipping, district: e.target.value})}
                                        className="w-full appearance-none px-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                    >
                                        {shipping.city && TAIWAN_AREAS[shipping.city]?.map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                    </select>
                                    <Icons.ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={12} />
                                </div>
                             </div>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">詳細地址 (街道、巷弄、門牌)</label>
                            <input 
                                type="text"
                                value={shipping.address}
                                onChange={(e) => setShipping({...shipping, address: e.target.value})}
                                onBlur={() => handleBlur('address')}
                                placeholder="請輸入詳細地址"
                                className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 transition-all shadow-sm ${
                                    touched.address && !isAddressValid 
                                    ? 'border-red-400 ring-red-100 dark:ring-red-900/30 text-red-900' 
                                    : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500 text-slate-900 dark:text-white'
                                }`}
                            />
                         </div>
                    </div>

                    {/* Time Slot */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">希望送達時段</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(DeliveryTimeSlot).map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => setShipping({...shipping, timeSlot: slot})}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                        shipping.timeSlot === slot 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/20' 
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : settings.enableStoreIntegration ? (
                // --- Store Selection (Integrated) ---
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
                // --- Store Selection (Manual) ---
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
                            onChange={(e) => setShipping({
                                ...shipping, 
                                storeName: e.target.value,
                                storeType: StoreType.MANUAL_INPUT // Explicitly set type on manual input
                            })}
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
        {/* ... existing code ... */}
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

        {/* Updated Shipping Summary Review - Compact & Editable */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl relative">
             <div className="flex justify-between items-center mb-2">
                 <h5 className="text-xs font-bold text-slate-500">配送資訊確認</h5>
                 <button 
                    onClick={() => !isSubmitting && setStep(1)}
                    disabled={isSubmitting}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30 disabled:opacity-50"
                 >
                    修改
                 </button>
             </div>
             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                 <span className="text-slate-400 text-xs font-medium self-center">收件資訊</span>
                 <p className="font-bold text-slate-900 dark:text-white truncate">
                    {shipping.name} <span className="font-normal text-slate-500 ml-1">{shipping.phone}</span>
                 </p>
                 
                 <span className="text-slate-400 text-xs font-medium self-start mt-0.5">
                    {isDelivery ? '宅配地址' : '取貨門市'}
                 </span>
                 <div>
                    {isDelivery ? (
                         <>
                            <p className="text-slate-700 dark:text-slate-300 leading-tight">
                                {shipping.city}{shipping.district}{shipping.address}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Icons.Truck size={10} /> 時段：{shipping.timeSlot}
                            </p>
                         </>
                     ) : (
                         <p className="text-slate-700 dark:text-slate-300 leading-tight">{shipping.storeName}</p>
                     )}
                 </div>
             </div>
        </div>

        <div className="space-y-3">
             <label className="text-sm font-medium text-slate-600 dark:text-slate-400">付款方式</label>
             
             {settings.enableOnlinePayment ? (
                 // Active: Online Payment Buttons
                 <>
                    <button
                        onClick={() => setPaymentMethod(PaymentMethod.APPLE_PAY)}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                 // Inactive: Structured Bank Info Card
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

                     {/* Updated Warning Block to Orange Style to match Store Selection */}
                     <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex gap-3 shadow-sm">
                         <div className="text-orange-500 flex-shrink-0 mt-0.5"><Icons.Alert size={20} /></div>
                         <div>
                             <p className="text-sm font-bold text-orange-800 dark:text-orange-200 mb-1">匯款小叮嚀</p>
                             <ul className="text-xs text-orange-800 dark:text-orange-300 space-y-1 list-disc pl-3">
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

  const renderStep3 = () => {
    // ... existing code ...
    const handleShareOrderId = async () => {
         // Updated share text with emojis and specific instructions
         const shareText = `【海鮮小劉】🎉 已收到您的訂單！\n\n訂單編號：${orderId}\n\n⚠️ 麻煩於 2 日內完成匯款，並回傳「帳號末五碼」至官方 LINE 以利對帳。\n🚚 訂單將於款項確認後的 3-5 個工作日出貨。\n\n🔍 訂單查詢：${window.location.origin}`;

         // Try Native Share first (Mobile experience)
         if (navigator.share) {
             try {
                 await navigator.share({
                     title: '海鮮小劉訂單確認',
                     text: shareText,
                 });
             } catch (err) {
                 // User cancelled or error, fallback to LINE
                 console.log(err);
             }
         } else {
             // Fallback to direct LINE share for Desktop/Unsupported browsers
             const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
             window.open(lineUrl, '_blank');
         }
    };

    return (
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
            <div className="mb-6 w-full bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex items-start gap-3 shadow-sm text-left">
                <span className="text-2xl flex-shrink-0">👾</span>
                <div>
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-200">貼心小提醒</p>
                    <p className="text-xs text-orange-800 dark:text-orange-300 mt-1 leading-relaxed">
                        請記得於 <span className="font-bold underline">2日內</span> 完成匯款並<span className="font-bold">回傳證明</span>，才能為您保留訂單喔！
                    </p>
                </div>
            </div>
         )}
         
         <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl w-full flex items-center justify-between mb-6 border border-slate-200 dark:border-slate-700">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-left mb-1">訂單編號</p>
                <p className="font-mono font-bold text-slate-800 dark:text-white tracking-wider">{orderId}</p>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => handleCopy(orderId)}
                    className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                    title="複製單號"
                >
                    <Icons.Copy size={18} />
                </button>
            </div>
         </div>

         <div className="flex flex-col gap-3 w-full">
             {/* 1. 加入 LINE 官方帳號 (Primary) */}
             <a 
                href="https://line.me/R/ti/p/@110zazyo"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#00C300] hover:bg-[#00B300] text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[#00C300] font-bold text-xs italic pr-0.5">L</span>
                </div>
                加入官方 LINE 帳號
             </a>

             {/* 2. Share Order Info (Secondary) - Moved from Icon to Button */}
             <button 
                onClick={handleShareOrderId}
                className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Icons.Share size={18} />
                轉傳我的訂單資訊
             </button>

             {/* 3. Share Website (Tertiary) */}
             <button 
                onClick={handleShareWebsite}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold py-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <Icons.Gift size={18} />
                推薦海鮮小劉官網
             </button>
         </div>
    </div>
    );
  };

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
                        <span>請填寫完整配送資訊</span>
                    </div>
                )}

                <button
                    onClick={handleNext}
                    disabled={(step === 1 && !isStep1Valid) || isSubmitting}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        (step === 1 && !isStep1Valid) || isSubmitting
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/30 active:scale-[0.98]'
                    }`}
                >
                    {isSubmitting ? (
                        <Icons.Loading className="animate-spin" size={20} />
                    ) : (
                        <>
                            {step === 1 ? '下一步' : settings.enableOnlinePayment ? `確認支付 $${product.price}` : `送出訂單 $${product.price}`}
                            {step === 1 && <Icons.Next size={20} />}
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutFlow;
