
import * as firebaseApp from "firebase/app";
import * as firebaseFirestore from "firebase/firestore";
import * as firebaseStorage from "firebase/storage";
import * as firebaseAuth from "firebase/auth";

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
    // Fix: Using wildcard imports and extracting members via type casting to bypass environment-specific module resolution issues
    const { initializeApp } = firebaseApp as any;
    const { getFirestore } = firebaseFirestore as any;
    const { getStorage } = firebaseStorage as any;
    const { getAuth } = firebaseAuth as any;

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("🔥 Firebase 連線成功 (seafood-liu)！");
} catch (error) {
    console.error("Firebase 初始化失敗:", error);
}

export { db, storage, auth };
