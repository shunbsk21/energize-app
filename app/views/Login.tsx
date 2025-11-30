// ...existing code...
import React, { useState } from 'react';
import { Profile, LoginProps } from '../types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { GoogleIcon } from '../components/Icons';
// ...existing code...

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile: Profile = {
        id: user.uid,
        displayName: user.displayName ?? user.email ?? 'User',
        imageUrl: user.photoURL ?? `https://i.pravatar.cc/150?u=${user.uid}`
      };
      onLoginSuccess(profile);
    } catch (err) {
      setError((err as Error)?.message ?? 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm text-center">
            <h1 className="text-5xl font-bold text-indigo-600 mb-4">EnerGize</h1>
            <p className="text-gray-600 mb-8">あなたのエネルギーを管理し、より良い毎日へ。</p>

            <div className="bg-white p-8 rounded-2xl shadow-xl">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">ログイン</h2>
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
                >
                    <GoogleIcon className="w-6 h-6"/>
                    {loading ? '読み込み中...' : 'Googleでサインイン'}
                </button>

                {error && <div className="text-red-500 text-sm mt-3">{error}</div>}

                 <p className="text-xs text-gray-400 mt-6">
                    ※ Google アカウントでログインします。初回はポップアップが開きます。
                </p>
            </div>
             <footer className="text-center py-6 text-gray-500 text-sm mt-4">
                <p>Your personal dashboard for a better self.</p>
            </footer>
        </div>
    </div>
  );
};

export default Login;
// ...existing code...