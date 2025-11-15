"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc as firestoreDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Profile, Friend, Group as GroupType, Comment, Habit } from '../types';

interface GroupProps {
    profile: Profile;
    following: Friend[];
    followers: Friend[];
    onFollowUser: (friendId: string) => void;
    groups: GroupType[];
    groupInvites: GroupType[];
    onAddGroup: (newGroupData: Omit<GroupType, 'id'>) => void;
    onInviteToGroup: (group: GroupType, memberIdsToInvite: string[]) => void;
    onAcceptGroupInvite: (invite: GroupType) => void;
    onDeclineGroupInvite: (inviteId: string) => void;
    onRemoveMember: (groupId: string, memberIdToRemove: string) => void;
    onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
    habits: Habit[];
    setIsHelpOpen: (isOpen: boolean) => void;
    allUserProfiles: Map<string, Profile | Friend>;
    onUpdateGroupSharedHabits: (groupId: string, memberId: string, sharedHabitIds: string[]) => void;
}

const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
    const habitStartDate = new Date(habit.startDate);
    habitStartDate.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    if (targetDate < habitStartDate) return false;

    switch (habit.frequencyType) {
        case 'daily':
            return true;
        case 'weekly':
            return Array.isArray(habit.frequencyValue) && habit.frequencyValue.includes(targetDate.getDay());
        case 'monthly':
            return Array.isArray(habit.frequencyValue) && habit.frequencyValue.includes(targetDate.getDate());
        default:
            return false;
    }
};

const PlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);
const HelpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);
const ChevronLeftIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);
const SendIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405Z" />
    </svg>
);
const UserPlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
);
const UserMinusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const AddFriendInline: React.FC<{
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
}> = ({ profile, following, onFollowUser }) => {
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
                <input
                    type="text"
                    value={friendId}
                    onChange={(e) => { setFriendId(e.target.value); setError(''); }}
                    className="flex-grow p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                    placeholder="ユーザーID"
                />
                <button type="button" onClick={handleAddFriend} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">追加</button>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            {success && <p className="text-green-600 text-xs mt-1">{success}</p>}
        </div>
    );
};

const CreateGroupModal: React.FC<{
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
    onClose: () => void;
    onCreate: (name: string, members: string[], ownerId: string) => void;
}> = ({ profile, following, onFollowUser, onClose, onCreate }) => {
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
                                    <img src={friend.imageUrl || 'data:image/svgxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
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

const InviteMemberModal: React.FC<{
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
                                <img src={friend.imageUrl || 'data:image/svgxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
                                <span className="ml-2 text-gray-800">{friend.displayName}</span>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">招待できるフォロー中の友達がいません。</p>
                        )}
                    </div>
                    <AddFriendInline profile={profile} following={following} onFollowUser={onFollowUser} />
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                    <button type="button" onClick={handleInvite} disabled={selectedFriends.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow disabled:bg-gray-400">招待</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmRemoveModal: React.FC<{
    member: Profile | Friend;
    groupName: string;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ member, groupName, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-800">メンバーを退会させますか？</h3>
                <p className="text-gray-600 my-2 text-sm">
                    本当に <span className="font-bold">{member.displayName}</span> さんを
                    グループ「{groupName}」から退会させますか？
                </p>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold">
                        キャンセル
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold">
                        退会させる
                    </button>
                </div>
            </div>
        </div>
    );
};

const MemberHabitsModal: React.FC<{
    memberId: string;
    memberProfile: Profile | Friend | null;
    memberHabits?: Habit[]; // optional cache
    groupSharedHabitIds: string[];
    currentUserId: string;
    isFollowing: boolean;
    onClose: () => void;
    onFollowUser: (friendId: string) => void;
    onEditMySharedHabits?: () => void;
}> = ({ memberId, memberProfile, memberHabits, groupSharedHabitIds, currentUserId, isFollowing, onClose, onFollowUser, onEditMySharedHabits }) => {
    // memberHabits が渡されれば優先、なければ profile.habits を使う
    const habits: Habit[] = memberHabits || (memberProfile && (memberProfile as any).habits) || [];
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const sharedHabits = habits.filter(h => groupSharedHabitIds.includes(h.id));
    const isSelf = memberId === currentUserId;

    // ローカルに頻度表示ヘルパーを定義
    const weekdayNames = ['日','月','火','水','木','金','土'];
    const formatFrequency = (habit: Habit) => {
        const type = (habit as any).frequencyType;
        const val = (habit as any).frequencyValue;
        if (type === 'daily') return '毎日';
        if (type === 'weekly') {
            if (Array.isArray(val) && val.length > 0) {
                return '毎週 ' + val.map((d: number) => weekdayNames[d]).join('・');
            }
            return '毎週';
        }
        if (type === 'monthly') {
            if (Array.isArray(val) && val.length > 0) {
                return '毎月 ' + val.map((d: number) => `${d}日`).join('、');
            }
            return '毎月';
        }
        if (typeof val === 'string' && val) return String(val);
        if (Array.isArray(val) && val.length) return String(val);
        return '';
    };
    const getTitle = (habit: Habit) => {
      const h: any = habit;
      return h.title || h.name || h.label || '無題の習慣';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                {/* 右上クローズアイコン */}
                <button
                    onClick={onClose}
                    aria-label="閉じる"
                    className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-3">
                    <h3 className="text-lg font-bold">
                        {memberProfile?.displayName || 'ユーザー'} の共有習慣
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{`共有済みの習慣： ${sharedHabits.length} 件`}</p>
                    {sharedHabits.length === 0 && (
                        <p className="text-sm text-red-600 font-semibold mt-2">習慣の共有設定をしてください</p>
                    )}
                </div>

                {sharedHabits.length === 0 ? (
                    <div className="py-6 text-sm text-gray-500">このメンバーは、グループと共有している習慣がありません。</div>
                ) : (
                    <ul className="space-y-3 mb-4">
                        {sharedHabits.map(habit => {
                            const scheduled = isHabitScheduledForDate(habit, new Date());
                            const completed = (habit.completedDates || []).includes(todayStr);
                            return (
                                <li key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-semibold text-gray-800">{getTitle(habit)}</div>
                                        <div className="text-xs text-gray-500">{formatFrequency(habit)} {scheduled ? '・今日対象' : '・今日は対象外'}</div>
                                    </div>
                                    <div className="text-sm">
                                        {completed ? <span className="text-green-600 font-bold">完了</span> : <span className="text-gray-400">未実行</span>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="flex justify-end gap-2">
                    {isSelf ? (
                        <button onClick={() => { onEditMySharedHabits?.(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">共有習慣を編集</button>
                    ) : (
                        <>
                            {isFollowing ? (
                                <button disabled className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">フォロー済み</button>
                            ) : (
                                <button onClick={() => { onFollowUser(memberId); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">フォローする</button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const SharedHabitsModal: React.FC<{
    group: GroupType;
    profile: Profile;
    myHabits: Habit[];
    initialSharedIds: string[];
    onClose: () => void;
    onSave: (sharedIds: string[]) => void;
}> = ({ group, profile, myHabits, initialSharedIds, onClose, onSave }) => {
    // 初期選択: initialSharedIds があればそれ、無ければ myHabits を全選択（全て共有済みの想定）
    const [selected, setSelected] = useState<Set<string>>(() => {
        if (initialSharedIds && initialSharedIds.length > 0) return new Set(initialSharedIds);
        return new Set(myHabits.map(h => h.id));
    });

    useEffect(() => {
        // myHabits がロードされてから初期化したいケースへ対応（props の変化に追従）
        if ((!initialSharedIds || initialSharedIds.length === 0) && myHabits && myHabits.length > 0) {
            setSelected(new Set(myHabits.map(h => h.id)));
        }
        if (initialSharedIds && initialSharedIds.length > 0) {
            setSelected(new Set(initialSharedIds));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myHabits, JSON.stringify(initialSharedIds || [])]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id); else s.add(id);
            return s;
        });
    };

    const selectAll = () => {
        setSelected(new Set(myHabits.map(h => h.id)));
    };
    const clearAll = () => {
        setSelected(new Set());
    };

    const weekdayNames = ['日','月','火','水','木','金','土'];

    const formatFrequency = (habit: Habit) => {
        const type = habit.frequencyType;
        const val = habit.frequencyValue;
        if (type === 'daily') return '毎日';
        if (type === 'weekly') {
            if (Array.isArray(val) && val.length > 0) {
                return '毎週 ' + val.map((d: number) => weekdayNames[d]).join('・');
            }
            return '毎週';
        }
        if (type === 'monthly') {
            if (Array.isArray(val) && val.length > 0) {
                return '毎月 ' + val.map((d: number) => `${d}日`).join('、');
            }
            return '毎月';
        }
        if (typeof val === 'string' && val) return String(val);
        if (Array.isArray(val) && val.length) return String(val);
        return '';
    };

    const getTitle = (habit: Habit) => {
      const h: any = habit;
      return h.title || h.name || h.label || '無題の習慣';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">このグループで共有する習慣を選択</h3>
                    <div className="flex gap-2">
                        <button onClick={selectAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて選択</button>
                        <button onClick={clearAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて解除</button>
                    </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                    {myHabits.length === 0 && <p className="text-sm text-gray-500">まず習慣を作成してください。</p>}
                    {myHabits.map(h => (
                        <label key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-800">{getTitle(h)}</div>
                                <div className="text-xs text-gray-400">{formatFrequency(h)}</div>
                            </div>
                            <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggle(h.id)} />
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">キャンセル</button>
                    <button onClick={() => onSave(Array.from(selected))} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">保存</button>
                </div>
            </div>
        </div>
    );
};

const GroupDetail: React.FC<{
    group: GroupType;
    profile: Profile;
    following: Friend[];
    onFollowUser: (friendId: string) => void;
    onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
    habits: Habit[];
    onBack: () => void;
    onInviteMembers: (group: GroupType, memberIds: string[]) => void;
    onRemoveMember: (groupId: string, memberIdToRemove: string) => void;
    allUserProfiles: Map<string, Profile | Friend>;
    onUpdateGroupSharedHabits: (groupId: string, memberId: string, sharedHabitIds: string[]) => void;
}> = ({ 
    group, profile, following, onFollowUser, 
    onAddComment, habits, onBack, onInviteMembers, onRemoveMember, allUserProfiles,
    onUpdateGroupSharedHabits
}) => {
    const [newComment, setNewComment] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<(Profile | Friend) | null>(null);
    const [messages, setMessages] = useState<Comment[]>([]);

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isSharedHabitsOpen, setIsSharedHabitsOpen] = useState(false);

    const groupSharedIds: string[] = (group as any).sharedHabitIds || (group as any).sharedHabits || [];
    const groupSharedByMember = (group as any).sharedByMember || {};

    const [memberSharedMap, setMemberSharedMap] = useState<Record<string, string[]>>({});
    const [memberHabitsMap, setMemberHabitsMap] = useState<Record<string, Habit[]>>({});

    useEffect(() => {
        const q = query(
            collection(db, 'group_chats', group.id, 'messages'),
            orderBy('timestamp', 'asc')
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const loadedMessages: Comment[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                loadedMessages.push({
                    id: doc.id,
                    groupId: data.groupId,
                    authorId: data.authorId,
                    authorName: data.authorName,
                    text: data.text,
                    timestamp: data.timestamp,
                    authorImageUrl: data.authorImageUrl || null
                } as Comment);
            });
            setMessages(loadedMessages);
        }, (error) => {
            console.error("チャットの読み込みに失敗しました:", error);
        });
        return () => unsubscribe();
    }, [group.id]);

    useEffect(() => {
        if (!selectedMemberId) return;
        let cancelled = false;
        (async () => {
            try {
                // 1) member の users/{memberId}/groups/{groupId}
                const memberGroupDocRef = firestoreDoc(db, 'users', selectedMemberId, 'groups', group.id);
                const snap = await getDoc(memberGroupDocRef);
                if (cancelled) return;
                if (snap.exists()) {
                    const data = snap.data() as any;
                    const sharedForGroup = (data?.sharedByMember && data.sharedByMember[selectedMemberId]) || data?.sharedHabitIds || [];
                    console.debug('[Group] member groups doc found', { memberId: selectedMemberId, groupId: group.id, path: `users/${selectedMemberId}/groups/${group.id}`, sharedForGroup, rawData: data });
                    setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
                    return;
                }

                // 2) global groups/{groupId}
                try {
                    const globalGroupRef = firestoreDoc(db, 'groups', group.id);
                    const gSnap = await getDoc(globalGroupRef);
                    if (!cancelled && gSnap.exists()) {
                        const gdata = gSnap.data() as any;
                        const sharedForGroup = (gdata?.sharedByMember && gdata.sharedByMember[selectedMemberId]) || gdata?.sharedHabitIds || [];
                        console.debug('[Group] global groups doc found', { memberId: selectedMemberId, groupId: group.id, path: `groups/${group.id}`, sharedForGroup, rawData: gdata });
                        setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(sharedForGroup) ? sharedForGroup : [] }));
                        return;
                    }
                } catch (e) { console.debug('[Group] global groups fetch failed', e); }

                // 3) fallback: group object
                const fallback = (group as any).sharedByMember && (group as any).sharedByMember[selectedMemberId];
                console.debug('[Group] fallback used for shared habits', { memberId: selectedMemberId, groupSharedByMember: (group as any).sharedByMember, fallback });
                setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: Array.isArray(fallback) ? fallback : [] }));
            } catch (err) {
                console.error('failed to load member shared habits', err);
                setMemberSharedMap(prev => ({ ...prev, [selectedMemberId]: [] }));
            }
        })();
        return () => { cancelled = true; };
    // 依存配列は要素数を固定するためプリミティブ化して渡す
    }, [selectedMemberId, group.id, JSON.stringify((group as any)?.sharedByMember || (group as any)?.sharedHabitIds || {})]);

    useEffect(() => {
        if (!selectedMemberId) return;
        // 既にキャッシュがあれば何もしない
        if (memberHabitsMap[selectedMemberId]) return;
        let cancelled = false;
        (async () => {
            try {
                const habitsCol = collection(db, 'users', selectedMemberId, 'habits');
                const q = query(habitsCol);
                const snap = await getDocs(q);
                if (cancelled) return;
                const loaded: Habit[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Habit));
                console.debug('[Group] loaded member habits', { memberId: selectedMemberId, count: loaded.length });
                setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: loaded }));
            } catch (err) {
                console.error('[Group] failed to load member habits', selectedMemberId, err);
                setMemberHabitsMap(prev => ({ ...prev, [selectedMemberId]: [] }));
            }
        })();
        return () => { cancelled = true; };
    // 依存配列で selectedMemberId の有無を考慮して参照するように変更
    }, [selectedMemberId, JSON.stringify(selectedMemberId ? (memberHabitsMap[selectedMemberId] || []) : [])]);

    // デバッグログ: メンバーモーダルを開くときに resolvedShared をログに出す（関数をJSXとして返していた箇所を修正）
    const _resolvedSharedJSON = selectedMemberId ? JSON.stringify(memberSharedMap[selectedMemberId] || groupSharedByMember[selectedMemberId] || groupSharedIds || []) : '[]';
    const _memberHabitsJSON = selectedMemberId ? JSON.stringify(((allUserProfiles.get(selectedMemberId) as any)?.habits) || []) : '[]';
    useEffect(() => {
        if (!isMemberModalOpen || !selectedMemberId) return;
        try {
            const resolvedShared = JSON.parse(_resolvedSharedJSON) as string[];
            const memberHabits = JSON.parse(_memberHabitsJSON) as any[];
            console.debug('[Group] opening MemberHabitsModal', { selectedMemberId, resolvedShared, memberHabits });
        } catch (e) {
            console.debug('[Group] opening MemberHabitsModal (parse failed)', { selectedMemberId, _resolvedSharedJSON, _memberHabitsJSON, err: e });
        }
    }, [isMemberModalOpen, selectedMemberId, _resolvedSharedJSON, _memberHabitsJSON]);

    const getMemberProfile = (memberId: string) => {
        return allUserProfiles.get(memberId) || { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
    };

    const getMemberProgress = (memberId: string): number | null => {
        // 自分自身は既存ロジックのまま
        if (memberId === profile.id) {
            const today = new Date();
            const todayStr = today.toLocaleDateString('sv-SE');
            const scheduled = habits.filter(h => isHabitScheduledForDate(h, today));
            if (scheduled.length === 0) return 0;
            const completed = scheduled.filter(h => (h.completedDates || []).includes(todayStr)).length;
            return Math.round((completed / scheduled.length) * 100);
        }

        // グループで共有している習慣の id 列を取得
        const sharedForMember = groupSharedByMember[memberId] || memberSharedMap[memberId] || [];
        if (!sharedForMember || sharedForMember.length === 0) {
            // 共有習慣が0件なら達成率を出さない
            return null;
        }

        // メンバーの習慣オブジェクトをキャッシュから取得
        const memberHabits = memberHabitsMap[memberId];
        if (!memberHabits) {
            // 習慣データがまだロードされていなければ表示を保留（'-' 表示）
            return null;
        }

        // 共有対象の habit オブジェクトだけ抽出
        const sharedHabits = memberHabits.filter(h => sharedForMember.includes(h.id));
        if (sharedHabits.length === 0) {
            // id はあるが habit オブジェクトが見つからない場合は 0% を返す（保守的）
            return 0;
        }

        // 今日が対象の習慣のみで達成率を計算
        const today = new Date();
        const todayStr = today.toLocaleDateString('sv-SE');
        const scheduledToday = sharedHabits.filter(h => isHabitScheduledForDate(h, today));
        if (scheduledToday.length === 0) {
            // 共有はあるが今日対象がなければ 0%
            return 0;
        }
        const completedToday = scheduledToday.filter(h => (h.completedDates || []).includes(todayStr)).length;
        return Math.round((completedToday / scheduledToday.length) * 100);
    };

    const handlePostComment = () => {
        if(!newComment.trim()) return;
        const commentData: Omit<Comment, 'id'> = {
            groupId: group.id,
            authorId: profile.id,
            authorName: profile.displayName,
            text: newComment.trim(),
            timestamp: new Date().toISOString()
        };
        onAddComment(commentData);
        setNewComment('');
    };

    // グループ化: 日付（YYYY/MM/DD）ごとにメッセージをまとめる
    const groupedMessages = useMemo(() => {
        const groups: Record<string, Comment[]> = {};
        messages.forEach(m => {
            const d = m.timestamp ? new Date(m.timestamp) : new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const key = `${yyyy}/${mm}/${dd}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return Object.keys(groups)
            .sort((a, b) => a.localeCompare(b))
            .map(date => ({ date, items: groups[date] }));
    }, [messages]);
    
    const followingIds = useMemo(() => new Set(following.map(f => f.id)), [following]);
    const isOwner = profile.id === group.ownerId;

    const confirmRemoveMember = () => {
        if (memberToRemove) {
            onRemoveMember(group.id, memberToRemove.id);
            setMemberToRemove(null);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <h2 className="text-2xl font-bold text-gray-800">{group.name}</h2>

                {group.members.includes(profile.id) && (
                    <button onClick={() => setIsSharedHabitsOpen(true)} className="ml-3 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-sm">
                        自分の共有習慣を設定
                    </button>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">今日の進捗</h3>
                    {isOwner && (
                        <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold p-2 rounded-md hover:bg-indigo-50">
                            <UserPlusIcon className="w-5 h-5" />
                            招待する
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {group.members.map(memberId => {
                        const member = getMemberProfile(memberId);
                        const progress = getMemberProgress(memberId);
                        const isSelf = memberId === profile.id;
                        const isFollowing = followingIds.has(memberId);

                        return (
                            <div key={memberId} className="flex items-center gap-4">
                                <button onClick={() => { setSelectedMemberId(memberId); setIsMemberModalOpen(true); }} className="flex items-center gap-4 flex-grow text-left">
                                    <img src={(member && member.imageUrl) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} alt={member.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-700">{member.displayName}</span>
                                                {isFollowing && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">フォロー済み</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-indigo-600">{progress === null ? '-' : `${progress}%`}</span>
                                        </div>
                                        {progress !== null ? (
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div className="bg-indigo-500 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-2.5" />
                                        )}
                                    </div>
                                </button>

                                {!isSelf && !isFollowing && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onFollowUser(memberId); }}
                                        className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                        title={`${member.displayName} をフォローする`}
                                    >
                                        <UserPlusIcon className="w-5 h-5" />
                                    </button>
                                )}
                                {isOwner && !isSelf && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setMemberToRemove(member); }}
                                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                        title={`${member.displayName} を退会させる`}
                                    >
                                        <UserMinusIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">コメント</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-4">
                    {groupedMessages.map(group => (
                        <div key={group.date} className="mb-6">
                            {/* 日付セパレータ（中央に丸いバッジ、両側に薄い線） */}
                            <div className="flex items-center justify-center my-3">
                                <div className="flex items-center gap-3 w-full max-w-md">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="inline-block text-xs text-gray-500 bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
                                        {group.date}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {group.items.map(message => {
                                    const isAuthor = message.authorId === profile.id;
                                    const authorImageUrl = (message as any).authorImageUrl || null;

                                    return (
                                        <div key={message.id} className={`flex gap-2 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                                            {!isAuthor && (
                                                <img
                                                    src={authorImageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                                                    alt={message.authorName}
                                                    className="w-8 h-8 rounded-full object-cover bg-gray-200 mt-1"
                                                />
                                            )}
                                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isAuthor ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'} shadow-sm`}>
                                                {!isAuthor && <p className="text-xs font-bold text-indigo-600 mb-1">{allUserProfiles.get(message.authorId)?.displayName || '名無しのさん'}</p>}
                                                <p className="text-sm">{message.text}</p>
                                                <p className={`text-xs mt-1 ${isAuthor ? 'text-indigo-200' : 'text-gray-400'} text-right`}>
                                                    {new Date(message.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="コメントを入力..." onKeyPress={e => e.key === 'Enter' && handlePostComment()} className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"/>
                    <button onClick={handlePostComment} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {isMemberModalOpen && selectedMemberId && (
                <MemberHabitsModal
                    memberId={selectedMemberId}
                    memberProfile={(allUserProfiles.get(selectedMemberId) as Profile | Friend) || null}
                    memberHabits={memberHabitsMap[selectedMemberId]} // 追加：取得済みの習慣を渡す
                    groupSharedHabitIds={memberSharedMap[selectedMemberId] || groupSharedByMember[selectedMemberId] || groupSharedIds || []}
                    currentUserId={profile.id}
                    isFollowing={followingIds.has(selectedMemberId)}
                    onClose={() => { setIsMemberModalOpen(false); setSelectedMemberId(null); }}
                    onFollowUser={(id) => { onFollowUser(id); }}
                    onEditMySharedHabits={() => { setIsMemberModalOpen(false); setIsSharedHabitsOpen(true); }}
                />
            )}

            {isSharedHabitsOpen && (
              <SharedHabitsModal
                group={group}
                profile={profile}
                myHabits={habits}
                initialSharedIds={groupSharedByMember[profile.id] || []}
                onClose={() => setIsSharedHabitsOpen(false)}
                onSave={(ids) => {
                    onUpdateGroupSharedHabits(group.id, profile.id, ids);
                    setIsSharedHabitsOpen(false);
                }}
              />
            )}
            {isInviteModalOpen && (
                <InviteMemberModal
                    group={group}
                    profile={profile}
                    following={following}
                    onFollowUser={onFollowUser}
                    onClose={() => setIsInviteModalOpen(false)}
                    onInvite={(memberIds) => onInviteMembers(group, memberIds)}
                />
            )}
            {memberToRemove && (
                <ConfirmRemoveModal 
                    member={memberToRemove}
                    groupName={group.name}
                    onClose={() => setMemberToRemove(null)}
                    onConfirm={confirmRemoveMember}
                />
            )}
        </div>
    );
};

const Group: React.FC<GroupProps> = ({ 
    profile, 
    following,
    followers,
    onFollowUser,
    groups, 
    groupInvites,
    onAddGroup,
    onInviteToGroup,
    onAcceptGroupInvite,
    onDeclineGroupInvite,
    onRemoveMember,
    onAddComment,
    habits, 
    setIsHelpOpen,
    allUserProfiles,
    onUpdateGroupSharedHabits
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

    const handleCreateGroup = (name: string, members: string[]) => {
        const newGroupData: Omit<GroupType, 'id'> = {
            name,
            members,
            ownerId: profile.id
        };
        onAddGroup(newGroupData);
    };
    
    const handleInviteMembers = (group: GroupType, memberIds: string[]) => {
        onInviteToGroup(group, memberIds);
    };

    if (selectedGroup) {
        return <GroupDetail 
                    group={selectedGroup} 
                    profile={profile} 
                    following={following}
                    onFollowUser={onFollowUser}
                    onAddComment={onAddComment}
                    habits={habits} 
                    onBack={() => setSelectedGroup(null)} 
                    onInviteMembers={handleInviteMembers}
                    onRemoveMember={onRemoveMember}
                    allUserProfiles={allUserProfiles}
                    onUpdateGroupSharedHabits={onUpdateGroupSharedHabits}
                />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">グループ</h2>
                    <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <HelpIcon className="w-6 h-6" />
                    </button>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md text-sm sm:text-base"
                >
                    <PlusIcon className="w-5 h-5"/>
                    <span>作成</span>
                </button>
            </div>

            {groupInvites.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">招待されているグループ</h3>
                    <div className="space-y-3">
                        {groupInvites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                                <div>
                                    <span className="font-semibold text-indigo-800">{invite.name}</span>
                                    <span className="text-sm text-gray-500 ml-2">({invite.members.length}人)</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onDeclineGroupInvite(invite.id)}
                                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-semibold rounded-md hover:bg-gray-300"
                                    >
                                      拒否
                                    </button>
                                    <button
                                        onClick={() => onAcceptGroupInvite(invite)}
                                        className="px-3 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700"
                                    >
                                      参加
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">参加中のグループ</h3>
                <div className="space-y-4">
                    {groups.map(group => (
                        <div key={group.id} onClick={() => setSelectedGroup(group)} className="p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-indigo-400 transition-colors">
                            <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                            <div className="flex items-center mt-2">
                                <div className="flex -space-x-2">
                                    {group.members.slice(0,5).map(memberId => {
                                        const member = allUserProfiles.get(memberId);
                                        return (
                                            <img key={memberId} 
                                                 src={member?.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'} 
                                                 alt={member?.displayName || 'member'} 
                                                 className="w-8 h-8 rounded-full ring-2 ring-white object-cover bg-gray-200" />
                                        );
                                    })}
                                </div>
                                <span className="ml-3 text-sm text-gray-500">{group.members.length}人のメンバー</span>
                            </div>
                        </div>
                    ))}
                </div>

                {groups.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        <p>まだグループに参加していません。</p>
                        <p>新しいグループを作成するか、招待を待ちましょう！</p>
                    </div>
                )}
            </div>

            {isCreateOpen && <CreateGroupModal 
                                profile={profile} 
                                following={following}
                                onFollowUser={onFollowUser}
                                onClose={() => setIsCreateOpen(false)} 
                                onCreate={handleCreateGroup} 
                            />}
        </div>
    );
};

export default Group;