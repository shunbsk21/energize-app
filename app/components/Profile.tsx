"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useRef, useMemo } from 'react';
// ★ ユーザーの指示通り ../types に修正
import AddFriendModal from './AddFriendModal';
import { Profile, Friend } from '../types';
import { CameraIcon, CopyIcon, LogoutIcon } from './Icons';

// ★★★ Propsの定義を変更 ★★★
interface ProfileModalProps {
  profile: Profile;
  following: Friend[]; // ★ friends -> following
  followers: Friend[]; // ★ 追加
  onFollowUser: (friendId: string) => void; // ★ onAddFriend -> onFollowUser
  onClose: () => void;
  onLogout: () => void;
  onSave: (newDisplayName: string, newImageUrl: string | null) => void;
}


// ★★★ ProfileModal の Props を修正 ★★★
const ProfileModal: React.FC<ProfileModalProps> = ({ 
    profile, 
    following, // ★ 修正
    followers, // ★ 追加
    onFollowUser, // ★ 修正
    onClose, 
    onLogout,
    onSave
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [imagePreview, setImagePreview] = useState<string | null>(profile.imageUrl ?? null);
  const [imageData, setImageData] = useState<string | null>(profile.imageUrl ?? null);
  const [copySuccess, setCopySuccess] = useState('');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (↓ handleImageChange は変更なし)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setImageData(base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // (↓ handleSave は変更なし)
  const handleSave = () => {
    onSave(displayName || profile.displayName || '', imageData);
    onClose();
  }

  // (↓ copyToClipboard は変更なし)
  const copyToClipboard = () => {
    if(!navigator.clipboard) {
        setCopySuccess('コピー機能が利用できません');
        setTimeout(() => setCopySuccess(''), 2000);
        return;
    }
    navigator.clipboard.writeText(profile.id).then(() => {
        setCopySuccess('コピーしました！');
        setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
        setCopySuccess('コピーに失敗しました');
        setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  // ★ 友達候補（フォロワーのうち、まだフォローしていない人）を計算
  const friendCandidates = useMemo(() => {
    const followingIds = new Set(following.map(f => f.id));
    return followers.filter(follower => !followingIds.has(follower.id));
  }, [followers, following]);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-gray-800">プロフィール設定</h2>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
         </div>
        
         <div className="flex flex-col items-center gap-4">
             <div className="relative">
                 <img
                     src={imagePreview || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='}
                     alt={displayName ?? ''}
                     className="w-28 h-28 rounded-full object-cover bg-gray-200 ring-4 ring-white"
                 />
                 <button
                     onClick={() => fileInputRef.current?.click()}
                     className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow transition"
                 >
                     <CameraIcon className="w-5 h-5"/>
                 </button>
                 <input
                     type="file"
                     ref={fileInputRef}
                     onChange={handleImageChange}
                     accept="image/*"
                     className="hidden"
                 />
             </div>

             <div className="w-full">
                 <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">表示名</label>
                 <input
                     id="displayName"
                     type="text"
                     value={displayName}
                     onChange={e => setDisplayName(e.target.value)}
                     className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                 />
             </div>
              <div className="w-full">
                 <label className="block text-sm font-medium text-gray-700">ユーザーID</label>
                 <div className="mt-1 flex items-center gap-2">
                     <p className="flex-grow p-2 bg-gray-100 rounded-lg text-gray-600 text-sm truncate">{profile.id}</p>
                     <button onClick={copyToClipboard} className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
                        <CopyIcon className="w-5 h-5" />
                     </button>
                 </div>
                  {copySuccess && <p className="text-xs text-green-600 mt-1 text-right">{copySuccess}</p>}
              </div>
         </div>
        
         <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
             <button type="button" onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-semibold">
                 <LogoutIcon className="w-5 h-5" />
                 ログアウト
             </button>
             <div className="flex gap-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                 <button type="button" onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow">保存</button>
             </div>
         </div>
      </div>
    </div>
    
    {isAddFriendOpen && <AddFriendModal 
                            profile={profile} 
                            following={following} // ★ friends -> following
                            onFollowUser={onFollowUser} // ★ onAddFriend -> onFollowUser
                            onClose={() => setIsAddFriendOpen(false)} 
                        />}
    </>
  );
};

export default ProfileModal;