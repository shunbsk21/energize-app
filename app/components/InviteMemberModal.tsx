"use client";

import Image from 'next/image';
import React, { useState, useMemo } from 'react';
import { Group as GroupType, Profile, Friend } from '../types';

export const InviteMemberModal: React.FC<{
  group: GroupType;
  profile: Profile;
  following: Friend[];
  onFollowUser: (friendId: string) => void;
  onClose: () => void;
  onInvite: (memberIds: string[]) => void;
}> = ({ group, profile, following, onFollowUser, onClose, onInvite }) => {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const availableFriends = useMemo(() => {
    const memberIds = new Set(group.members);
    return following.filter(f => !memberIds.has(f.id));
  }, [following, group.members]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) newSet.delete(friendId); else newSet.add(friendId);
      return newSet;
    });
  };

  const handleInvite = () => {
    onInvite(Array.from(selectedFriends));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">メンバーを招待</h2>
        <div className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableFriends.length > 0 ? availableFriends.map(friend => (
              <div key={friend.id} onClick={() => toggleFriend(friend.id)} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedFriends.has(friend.id) ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                <input type="checkbox" checked={selectedFriends.has(friend.id)} readOnly className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                <Image 
                  src={friend.imageUrl ?? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} 
                  alt={friend.displayName ?? ''} 
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" 
                />
                <span className="ml-2 text-gray-800">{friend.displayName ?? ''}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">招待できるフォロー中の友達がいません。</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
          <button type="button" onClick={handleInvite} disabled={selectedFriends.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow disabled:bg-gray-400">招待</button>
        </div>
      </div>
    </div>
  );
};