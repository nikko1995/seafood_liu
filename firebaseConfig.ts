import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// -----------------------------------------------------------
// 您的專案資訊 (seafood-liu)
// -----------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyC8afD79Pa1l1UCZ1ydzjdWn8KuoagerNI",
  authDomain: "seafood-liu.firebaseapp.com",
  projectId: "seafood-liu",
  storageBucket: "seafood-liu.firebasestorage.app",
  messagingSenderId: "49835016474",
  appId: "1:49835016474:web:486c64f372af579d756ca3",
  measurementId: "G-Z57HLMT855"
};

// -----------------------------------------------------------

// Initialize Firebase
let app;
let db: any;
let storage: any;
let auth: any;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("🔥 Firebase 連線成功 (seafood-liu)！");
} catch (error) {
    console.error("Firebase 初始化失敗:", error);
}

export { db, storage, auth };
