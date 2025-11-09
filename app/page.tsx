// app/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
// ↓ auth と onAuthStateChanged に加えて、User 型もインポート
import { auth } from  "@/lib/firebase"; // authのインポートパス
import { onAuthStateChanged, User } from 'firebase/auth'; 
import useLocalStorage from './hooks/useLocalStorage';
import Login from './components/Login';
import MainApp from './MainApp'; // MainAppコンポーネントを想定
import { Profile } from './types'; // あなたのProfile型

const App: React.FC = () => {
  // useLocalStorage を使って profile を管理
  const [profile, setProfile] = useLocalStorage<Profile | null>('userProfile', null);
  
  // 認証チェック中のローディング状態
  const [authLoading, setAuthLoading] = useState(true);

  // 認証状態の監視 (★ここを修正します)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // --- ログインしている場合 ---
        // Firebaseが返した user オブジェクトを信頼する。
        // localStorage に何が入っているかは気にしない。

        // ログイン成功時（Login.tsx）と同じ Profile オブジェクトを作成する
        // MainApp.tsxが期待する「型」に合わせてProfileオブジェクトを作成
        const userProfile: Profile = {
          id: user.uid,           // ★ `uid` を `id` というキーにマッピング
          uid: user.uid,          // （互換性のため uid も残しておく）
          email: user.email || '',
          displayName: user.displayName || 'EnerGize User', // 名前がない場合の対策
          imageUrl: user.photoURL || '', // ★ `photoURL` を `imageUrl` にマッピング
          
          // ... もし Profile 型で他に必須な項目があれば、ここで定義 ...
        };

        // useLocalStorage のセッター (setProfile) を呼び出す
        // これにより React の状態 (profile) が更新され、
        // 同時に 'userProfile' というキーで localStorage にも保存される。
        setProfile(userProfile);

      } else {
        // --- ログインしていない場合 ---
        // 状態 (profile) を null にする
        // useLocalStorage フックが localStorage から 'userProfile' を削除する
        setProfile(null);
      }
      
      // これで認証チェック（ログイン/ログアウトの判定）が完了
      setAuthLoading(false);
    });

    // コンポーネントが不要になったら監視を停止（メモリリーク防止）
    return () => unsubscribe();

  }, [setProfile]); // 依存配列に setProfile を指定

  
  // --- 表示のロジック（ここは変更なし） ---

  // 認証チェック中（authLoading=true）は、ちらつき防止のためローディング表示
  if (authLoading) {
    return <div>Loading...</div>; // またはローディングスピナー
  }

  // 認証チェック後、profile がなければ（nullなら）ログイン画面
  if (!profile) {
    // onLoginSuccess は setProfile を渡す（useLocalStorage のセッター）
    return <Login onLoginSuccess={setProfile} />;
  }

  // profile があればメインアプリ画面
  return <MainApp profile={profile} setProfile={setProfile} />;
};

export default App;