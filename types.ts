
export interface Product {
  id: string;
  title: string;
  price: number;
  description: string[];
  images: string[];
  badge?: string;
  longDescription?: string;
  isActive?: boolean; // New: Controls visibility
}

export enum Tab {
  PRODUCTS = 'products',
  BRAND = 'brand',
  ORDERS = 'orders',
  ADMIN = 'admin' // New: Admin Dashboard
}

export enum PaymentMethod {
  APPLE_PAY = 'Apple Pay',
  LINE_PAY = 'Line Pay',
  BANK_TRANSFER = '銀行轉帳' // New
}

export enum StoreType {
  SEVEN_ELEVEN = '7-ELEVEN',
  FAMILY_MART = '全家便利商店',
  MANUAL_INPUT = '自行輸入' // New
}

export interface ShippingInfo {
  name: string;
  // email field removed
  phone: string;
  storeType: StoreType | null;
  storeName: string;
}

export interface Order {
  id: string;
  customerName: string;
  // customerEmail field removed
  customerPhone: string;
  date: string; // Created Time
  lastUpdated?: string; // New: Track status changes
  total: number;
  status: '處理中' | '已出貨' | '已完成' | '已取消'; // Expanded status
  items: string[];
}

export interface SiteSettings {
  enableStoreIntegration: boolean; // True: Map Selection, False: Manual Link
  storeFallbackMessage: string;
  storeLookupLink: string;
  enableOnlinePayment: boolean; // True: Apple/Line Pay, False: Bank Info
  bankName: string;        // New: Structured Data
  bankAccount: string;     // New: Structured Data
  bankAccountName: string; // New: Structured Data
  lastUpdated?: string;    // New: Track settings changes
}
