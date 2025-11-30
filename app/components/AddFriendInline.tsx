"use client";

import React, { useState } from 'react';
import { Profile, Friend } from '../types';

interface AddFriendInlineProps {
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
}

const AddFriendInline: React.FC<AddFriendInlineProps> = ({ profile, following, onFollowUser }) => {
    const [friendId, setFriendId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
        setFriendId('');
        setSuccess(`フォローリクエストを送信しました！`);
        setTimeout(() => setSuccess(''), 3000);
    };

    return (
        <div className="p-3 bg-gray-100 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">友達をIDでフォロー</label>
            <div className="flex gap-2">
                <input type="text" value={friendId} onChange={(e) => { setFriendId(e.target.value); setError(''); }} className="flex-grow p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder="ユーザーID" />
                <button type="button" onClick={handleAddFriend} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">追加</button>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            {success && <p className="text-green-600 text-xs mt-1">{success}</p>}
        </div>
    );
};

export default AddFriendInline;