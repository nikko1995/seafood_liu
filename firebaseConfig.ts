
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: 請將此處替換為您從 Firebase Console 取得的配置
// 1. 前往 https://console.firebase.google.com/
// 2. 建立專案 -> 新增 Web App -> 複製 firebaseConfig
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
// 為了避免在沒有設定 Key 時報錯導致白畫面，我們加一個簡單的檢查
let db: any;
let storage: any;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase config is missing. App is running in Mock Data mode.");
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { db, storage };
