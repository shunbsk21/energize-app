"use client";

import React, { useState, useEffect } from 'react';
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from 'firebase/auth';
import Login from './views/Login';
import MainApp from './MainApp';
// types.ts が page.tsx と同じ app/ フォルダにあるため、パスを ./types にします
import { AppProvider } from './context/AppContext';
import { Profile } from './types'; 

const App: React.FC = () => {
  // useLocalStorage を useState に変更
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // 認証チェック中のローディング状態
  const [authLoading, setAuthLoading] = useState(true);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // --- ログインしている場合 ---
        
        // ★ エラーを修正:
        // types.tsx の Profile の定義に合わせ、id, displayName, imageUrl のみ設定します。
        const userProfile: Profile = {
          id: user.uid,
          displayName: user.displayName ?? 'EnerGize User',
          imageUrl: user.photoURL ?? null, // types.tsx に合わせ、空文字ではなく null を設定
        };
        
        setProfile(userProfile);

      } else {
        // --- ログインしていない場合 ---
        setProfile(null);
      }
      
      // これで認証チェック（ログイン/ログアウトの判定）が完了
      setAuthLoading(false);
    });

    // コンポーネントが不要になったら監視を停止（メモリリーク防止）
    return () => unsubscribe();

  }, []); // 依存配列は空でOK

  
  // --- 表示のロジック ---

  // 認証チェック中（authLoading=true）は、ちらつき防止のためローディング表示
  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // 認証チェック後、profile がなければ（nullなら）ログイン画面
  if (!profile) {
    return <Login onLoginSuccess={setProfile} />;
  }

  // profile があればメインアプリ画面
  return (
    <AppProvider>
      <MainApp profile={profile} setProfile={setProfile} />
    </AppProvider>
  );
};

export default App;