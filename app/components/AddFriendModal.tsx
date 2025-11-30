"use client";

import React, { useState } from 'react';
import { Profile, Friend } from '../types';

interface AddFriendModalProps {
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
    onClose: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ profile, following, onFollowUser, onClose }) => {
    const [friendId, setFriendId] = useState('');
    const [error, setError] = useState('');
    
    const handleAddFriend = () => {
        const trimmedId = friendId.trim();
        if (!trimmedId) {
            setError('ユーザーIDを入力してください。');
            return;
        }
        if (trimmedId === profile.id) {
            setError('自分自身を友達として追加することはできません。');
            return;
        }
        if (following.some(f => f.id === trimmedId)) {
            setError('このユーザーは既にフォロー中です。');
            return;
        }

        onFollowUser(trimmedId);
        
        setError('');
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                 <h3 className="text-lg font-bold text-gray-800">友達をフォロー</h3>
                 <p className="text-gray-600 my-2 text-sm">追加したい友達のユーザーIDを入力してください。</p>
                 <input type="text" value={friendId} onChange={(e) => { setFriendId(e.target.value); setError(''); }} className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900" placeholder="ユーザーID" />
                 {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                 <div className="flex justify-end gap-2 mt-6">
                     <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold">キャンセル</button>
                     <button onClick={handleAddFriend} className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold">フォロー</button>
                 </div>
             </div>
         </div>
     );
};

export default AddFriendModal;