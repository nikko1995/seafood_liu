
import { db } from "../firebaseConfig";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  getDoc
} from "firebase/firestore";
import { Product, Order, SiteSettings } from "../types";
import { PRODUCTS, MOCK_ORDERS } from "../constants";

// Collections
const PRODUCTS_COL = "products";
const ORDERS_COL = "orders";
const SETTINGS_COL = "settings";
const SETTINGS_DOC_ID = "site_config";

// --- Products ---

export const fetchProducts = async (): Promise<Product[]> => {
  if (!db) return PRODUCTS; // Fallback to mock data
  try {
    const q = query(collection(db, PRODUCTS_COL));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data() as Product);
  } catch (error) {
    console.error("Error fetching products:", error);
    return PRODUCTS;
  }
};

export const saveProduct = async (product: Product): Promise<void> => {
  if (!db) {
      console.warn("No DB, save skipped");
      return;
  }
  try {
    await setDoc(doc(db, PRODUCTS_COL, product.id), product);
  } catch (error) {
    console.error("Error saving product:", error);
    throw error;
  }
};

export const removeProduct = async (productId: string): Promise<void> => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, PRODUCTS_COL, productId));
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// --- Orders ---

export const fetchOrders = async (): Promise<Order[]> => {
  if (!db) return MOCK_ORDERS;
  try {
    // Try to sort by date desc, requires index in Firebase Console (link will appear in console error if missing)
    // For now, let's fetch all and sort in client to avoid index creation friction
    const snapshot = await getDocs(collection(db, ORDERS_COL));
    if (snapshot.empty) return [];
    
    const orders = snapshot.docs.map(doc => doc.data() as Order);
    // Sort locally by date desc
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching orders:", error);
    return MOCK_ORDERS;
  }
};

export const createOrder = async (order: Order): Promise<void> => {
  if (!db) {
      console.warn("No DB, order creation skipped");
      return;
  }
  try {
    await setDoc(doc(db, ORDERS_COL, order.id), order);
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
  if (!db) return;
  try {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    await updateDoc(doc(db, ORDERS_COL, orderId), { 
      status,
      lastUpdated: timestamp
    });
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

// --- Settings ---

export const fetchSettings = async (): Promise<SiteSettings | null> => {
  if (!db) return null;
  try {
    const docRef = doc(db, SETTINGS_COL, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SiteSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
};

export const saveSettings = async (settings: SiteSettings): Promise<void> => {
  if (!db) return;
  try {
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), {
      ...settings,
      lastUpdated: timestamp
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
};
