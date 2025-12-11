
import { Product, Order } from './types';

// Using optimized Unsplash URLs with w=600 to ensure small file size but clear quality
export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    title: '小資減脂海鮮組',
    price: 1099,
    images: [
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop', // Salmon fillet
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=600&auto=format&fit=crop', // Fish dish
      'https://images.unsplash.com/photo-1628873722908-f1c5c707d79b?q=80&w=600&auto=format&fit=crop', // Squid
      'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?q=80&w=600&auto=format&fit=crop', // Plating
      'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?q=80&w=600&auto=format&fit=crop'  // Seafood boil background
    ],
    description: [
      '嚴選低脂白肉魚片',
      '急凍鮮甜透抽',
      '無刺虱目魚肚',
      '適合單身或兩人小家庭'
    ],
    longDescription: '專為注重身材管理的您設計。嚴選低脂高蛋白的白肉魚，搭配口感Q彈的急凍透抽，簡單乾煎或清蒸即可享受大海的鮮甜，無負擔的美味首選。',
    badge: '熱銷推薦'
  },
  {
    id: 'p2',
    title: '輕盈好食海鮮組',
    price: 1999,
    images: [
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?q=80&w=600&auto=format&fit=crop', // Seafood platter
      'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?q=80&w=600&auto=format&fit=crop', // Shrimp
      'https://images.unsplash.com/photo-1548508930-b3b3fae96c4d?q=80&w=600&auto=format&fit=crop', // Scallops
      'https://images.unsplash.com/photo-1559058789-672da06263d8?q=80&w=600&auto=format&fit=crop', // Salmon
      'https://images.unsplash.com/photo-1560717845-968823efbee1?q=80&w=600&auto=format&fit=crop'  // Raw shrimp
    ],
    description: [
      '特大北海道干貝',
      '深海野生大草蝦',
      '鮮嫩鮭魚切片',
      '週末犒賞自己的最佳選擇'
    ],
    longDescription: '來自北海道的生食級干貝，搭配肉質紮實的野生大草蝦。每一口都是極致的享受，適合週末在家與伴侶共享浪漫的燭光晚餐。'
  },
  {
    id: 'p3',
    title: '過年澎湃團聚組',
    price: 3999,
    images: [
      'https://images.unsplash.com/photo-1553659971-f01207815844?q=80&w=600&auto=format&fit=crop', // Lobster
      'https://images.unsplash.com/photo-1583950285655-08197c36a28d?q=80&w=600&auto=format&fit=crop', // Crab
      'https://images.unsplash.com/photo-1663046757656-788dfa935402?q=80&w=600&auto=format&fit=crop', // Abalone
      'https://images.unsplash.com/photo-1594988775266-419409e3e30f?q=80&w=600&auto=format&fit=crop', // Feast
      'https://images.unsplash.com/photo-1678120612450-7119e7454904?q=80&w=600&auto=format&fit=crop'  // Close up
    ],
    description: [
      '智利帝王蟹腳',
      '波士頓活凍龍蝦',
      '頂級鮑魚',
      '全家團圓必備豪華海鮮'
    ],
    longDescription: '年節團圓的餐桌主角！霸氣的帝王蟹腳與波士頓龍蝦，讓長輩笑得合不攏嘴。頂級食材一次到位，輕鬆煮出五星級飯店的圍爐大餐。',
    badge: '節慶限定'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-20231024-001',
    customerName: '王小明',
    customerPhone: '0912345678',
    date: '2023-10-24 14:30',
    lastUpdated: '2023-10-25 10:00',
    total: 1099,
    status: '已完成',
    items: ['小資減脂海鮮組']
  },
  {
    id: 'ORD-20240115-088',
    customerName: '李美華',
    customerPhone: '0987654321',
    date: '2024-01-15 09:15',
    lastUpdated: '2024-01-15 09:15',
    total: 3999,
    status: '處理中',
    items: ['過年澎湃團聚組']
  }
];
