
export interface Product {
  id: string;
  title: string;
  price: number;
  description: string[];
  images: string[];
  badge?: string;
  longDescription?: string;
  isActive?: boolean;
  category?: 'store' | 'delivery'; // New: Product Category
}

export enum Tab {
  PRODUCTS = 'products',
  BRAND = 'brand',
  ORDERS = 'orders',
  ADMIN = 'admin'
}

export enum PaymentMethod {
  APPLE_PAY = 'Apple Pay',
  LINE_PAY = 'Line Pay',
  BANK_TRANSFER = '銀行轉帳'
}

export enum StoreType {
  SEVEN_ELEVEN = '7-ELEVEN',
  FAMILY_MART = '全家便利商店',
  MANUAL_INPUT = '自行輸入'
}

export interface ShippingInfo {
  name: string;
  phone: string;
  storeType: StoreType | null;
  storeName: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  lastUpdated?: string;
  total: number;
  status: '待匯款' | '商品處理中' | '已出貨' | '訂單完成' | '匯款逾期' | '訂單取消'; // Updated statuses
  items: string[];
}

export interface BrandFeature {
    title: string;
    description: string;
    iconUrl?: string; // Optional custom icon URL
}

export interface BrandFooterItem {
    text: string;
    iconUrl?: string; // SVG data URI or Image URL
}

export interface SiteSettings {
  // Logistics & Payment
  enableStoreIntegration: boolean;
  storeFallbackMessage: string;
  storeLookupLink: string;
  enableOnlinePayment: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  lastUpdated?: string;

  // Website Identity
  websiteLogo?: string;
  websiteFavicon?: string;
  
  // Brand Page Content
  brandBannerImage?: string;
  brandBannerTitle?: string;
  brandFeatures?: BrandFeature[]; // Array of 2 items typically
  brandFooterItems?: BrandFooterItem[]; // Array of 3 items
}
