"use client";

import React, { useState, useEffect } from 'react';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from 'firebase/auth';
import Login from './components/Login';
import MainApp from './MainApp';
// types.ts が MainApp.tsx と同じ階層にあるなら、page.tsx から見ると ./types です
import { Profile } from './types'; 

const App: React.FC = () => {
  // ★ useLocalStorage を useState に変更
  // ブラウザを閉じたら状態は消えますが、再訪問時に onAuthStateChanged が
  // Firebaseから最新のログイン状態を取得して復元してくれます。
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // 認証チェック中のローディング状態
  const [authLoading, setAuthLoading] = useState(true);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // --- ログインしている場合 ---
        // MainApp.tsxが期待する「型」に合わせてProfileオブジェクトを作成
        const userProfile: Profile = {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'EnerGize User',
          imageUrl: user.photoURL || '',
        };
        setProfile(userProfile);
      } else {
        // --- ログインしていない場合 ---
        setProfile(null);
      }
      // 認証チェック完了
      setAuthLoading(false);
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, []); // 依存配列は空でOK（setProfileは安定しているため）

  // --- 表示のロジック ---

  // 認証チェック中はローディング表示
  if (authLoading) {
    // ここをリッチなローディング画面にしても良いですね
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // 認証チェック後、profile がなければログイン画面
  if (!profile) {
    // Loginコンポーネントに渡す setProfile も useState のセッターになります
    return <Login onLoginSuccess={setProfile} />;
  }

  // profile があればメインアプリ画面
  return <MainApp profile={profile} setProfile={setProfile} />;
};

export default App;