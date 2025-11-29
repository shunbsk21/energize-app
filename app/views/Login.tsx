// ...existing code...
import React, { useState } from 'react';
import { Profile } from '../types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
// ...existing code...

interface LoginProps {
  onLoginSuccess: (profile: Profile) => void;
}

const GoogleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block'}}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

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
    } catch (err: any) {
      setError(err?.message ?? 'ログインに失敗しました');
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