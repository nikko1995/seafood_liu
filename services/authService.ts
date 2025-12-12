
import { auth } from "../firebaseConfig";
import * as firebaseAuth from "firebase/auth";

// 使用任何型別 (any) 繞過環境特定的型別檢查問題
const { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} = firebaseAuth as any;

const firebaseSignOut = signOut;

// 登入功能：連線到 Google 驗證您的帳號密碼
export const loginAdmin = async (email: string, pass: string): Promise<any> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
};

// 登出功能
export const logoutAdmin = async (): Promise<void> => {
    if (!auth) return;
    await firebaseSignOut(auth);
};

// 監聽器：隨時檢查使用者是否處於登入狀態
export const subscribeToAuth = (callback: (user: any | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
};
