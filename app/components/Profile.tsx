"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useRef } from 'react';
// types.ts が MainApp.tsx と同じ階層にある想定 (`../types` -> `./types`)
import { Profile, Friend } from '../types';

// ★★★ Propsの定義を変更 ★★★
interface ProfileModalProps {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>; // これは useLocalStorage のセッターなので変更なし
  friends: Friend[];
  // setFriends: React.Dispatch<React.SetStateAction<Friend[]>>; // 削除
  onAddFriend: (friendId: string, friendData: Omit<Friend, 'id'>) => void; // ★ 追加
  onClose: () => void;
  onLogout: () => void;
}

// --- Icon Components Start (変更なし) ---
const CameraIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const UserPlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
);

const LogoutIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
);
// --- Icon Components End ---


// ★★★ AddFriendModal の Props を修正 ★★★
const AddFriendModal: React.FC<{
    profile: Profile;
    friends: Friend[];
    // setFriends: React.Dispatch<React.SetStateAction<Friend[]>>; // 削除
    onAddFriend: (friendId: string, friendData: Omit<Friend, 'id'>) => void; // ★ 追加
    onClose: () => void;
}> = ({ profile, friends, onAddFriend, onClose }) => {
    const [friendId, setFriendId] = useState('');
    const [error, setError] = useState('');
    
    const handleAddFriend = () => {
        // (↓ エラーチェックは変更なし)
        if (!friendId.trim()) {
            setError('ユーザーIDを入力してください。');
            return;
        }
        if (friendId === profile.id) {
            setError('自分自身を友達として追加することはできません。');
            return;
        }
        if (friends.some(f => f.id === friendId)) {
            setError('このユーザーは既に友達です。');
            return;
        }

        // ★ MainApp に渡すデータ (IDは除く)
        const newFriendData: Omit<Friend, 'id'> = {
            displayName: `ユーザー ${friendId.substring(0, 4)}`, // 仮の名前
            imageUrl: null
        };
        
        // ★ MainApp の onAddFriend を呼び出す (ID と データを渡す)
        onAddFriend(friendId, newFriendData);
        
        // setFriends(prev => [...prev, newFriend]); // 削除 (MainApp が state を更新)

        setError('');
        onClose(); // 成功したらモーダルを閉じる
    };

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                 <h3 className="text-lg font-bold text-gray-800">友達を追加</h3>
                 <p className="text-gray-600 my-2 text-sm">追加したい友達のユーザーIDを入力してください。</p>
                 <input
                     type="text"
                     value={friendId}
                     onChange={(e) => {
                         setFriendId(e.target.value);
                         setError('');
                     }}
                     className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                     placeholder="ユーザーID"
                 />
                 {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                 <div className="flex justify-end gap-2 mt-6">
                     <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold">
                         キャンセル
                     </button>
                     <button onClick={handleAddFriend} className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold">
                         追加
                     </button>
                 </div>
             </div>
         </div>
     );
};


// ★★★ ProfileModal の Props を修正 ★★★
const ProfileModal: React.FC<ProfileModalProps> = ({ 
    profile, 
    setProfile, 
    friends, 
    // setFriends, // 削除
    onAddFriend, // ★ 追加
    onClose, 
    onLogout 
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [imagePreview, setImagePreview] = useState<string | null>(profile.imageUrl);
  const [imageData, setImageData] = useState<string | null>(profile.imageUrl);
  const [copySuccess, setCopySuccess] = useState('');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (↓ handleImageChange, handleSave, copyToClipboard は変更なし)
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
  
  const handleSave = () => {
    setProfile({
        ...profile,
        displayName,
        imageUrl: imageData,
    });
    // TODO: ここで setProfile とは別に、
    // Firestore の "users" コレクションの profile ドキュメントも
    // 更新するロジックを MainApp.tsx 側で実装し、
    // (onUpdateProfile のような関数) ここで呼ぶのが望ましい
    onClose();
  }

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
                     alt="プロフィール画像"
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
        
         <div className="mt-6 pt-4 border-t w-full">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="text-md font-bold text-gray-700">友達リスト</h3>
                 <button onClick={() => setIsAddFriendOpen(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold p-2 rounded-md hover:bg-indigo-50">
                     <UserPlusIcon className="w-4 h-4" />
                     追加
                 </button>
             </div>
             <div className="space-y-2 max-h-32 overflow-y-auto">
                 {friends.length > 0 ? friends.map(friend => (
                     <div key={friend.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <img
                             src={friend.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='}
                             alt={friend.displayName}
                             className="w-8 h-8 rounded-full object-cover bg-gray-200"
                         />
                         <span className="text-gray-800">{friend.displayName}</span>
                     </div>
                 )) : <p className="text-gray-500 text-sm text-center py-2">まだ友達がいません。</p>}
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
    
    {/* ★★★ AddFriendModal に onAddFriend を渡す ★★★ */}
    {isAddFriendOpen && <AddFriendModal 
                            profile={profile} 
                            friends={friends} 
                            // setFriends={setFriends} // 削除
                            onAddFriend={onAddFriend} // ★ 追加
                            onClose={() => setIsAddFriendOpen(false)} 
                        />}
    </>
  );
};

export default ProfileModal;