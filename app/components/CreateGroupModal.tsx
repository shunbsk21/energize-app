"use client";

import React, { useState } from 'react';
import { Profile, Friend } from '../types';
import AddFriendInline from './AddFriendInline';

interface CreateGroupModalProps {
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
    onClose: () => void;
    onCreate: (name: string, members: string[], ownerId: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ profile, following, onFollowUser, onClose, onCreate }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const toggleFriend = (friendId: string) => {
        setSelectedFriends(prev => {
            const newSet = new Set(prev);
            if (newSet.has(friendId)) newSet.delete(friendId); else newSet.add(friendId);
            return newSet;
        });
    };

    const handleCreate = () => {
        if (!groupName.trim()) {
            setError('グループ名を入力してください。');
            return;
        }
        onCreate(groupName, [profile.id, ...Array.from(selectedFriends)], profile.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">新しいグループを作成</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">グループ名</label>
                        <input type="text" value={groupName} onChange={e => { setGroupName(e.target.value); setError(''); }} placeholder="例: 朝活部" className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"/>
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">メンバーを招待 (フォロー中の友達)</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                            {following.length > 0 ? following.map(friend => (
                                <div key={friend.id} onClick={() => toggleFriend(friend.id)} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedFriends.has(friend.id) ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                                    <input type="checkbox" checked={selectedFriends.has(friend.id)} readOnly className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                    <img src={friend.imageUrl ?? 'data:image/svgxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName ?? ''} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
                                    <span className="ml-2 text-gray-800">{friend.displayName}</span>
                                </div>
                            )) : <p className="text-center text-sm text-gray-500 py-4">まず友達をフォローしましょう</p>}
                        </div>
                    </div>
                    <AddFriendInline profile={profile} following={following} onFollowUser={onFollowUser} />
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                    <button type="button" onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow">作成</button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;