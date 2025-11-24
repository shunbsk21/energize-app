"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { collection, query, onSnapshot, orderBy, doc as firestoreDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Profile, Friend, Group as GroupType, Comment, Habit } from '../types';
import GroupDetail from './GroupDetail';

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

// --- HabitTracker と同等の達成率ロジック（Group 用） ---
const calculateCompletionPercentForDate = (date: Date, habitsList: Habit[]) => {
  const dateStr = date.toLocaleDateString('sv-SE');
  const scheduled = (habitsList || []).filter(h => {
    if (!isHabitScheduledForDate(h, date)) return false;
    const skipped = ((h as any).skippedDates || []).map((s: string) => {
      const dt = new Date(s); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
    });
    return !skipped.includes(dateStr);
  });
  if (scheduled.length === 0) return 0;
  const completedCount = scheduled.reduce((acc, h) => {
    if ((h.type ?? 'binary') === 'amount') {
      const val = ((h.completedAmounts || {})[dateStr] ?? 0);
      const target = h.target ?? 0;
      const ok = target > 0 ? val >= target : val > 0;
      return acc + (ok ? 1 : 0);
    } else {
      const doneKeys = (h.completedDates || []).map(d => {
        const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
      });
      return acc + (doneKeys.includes(dateStr) ? 1 : 0);
    }
  }, 0);
  return Math.round((completedCount / scheduled.length) * 100);
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
    // ページ内遷移用：フォロー中の友達一覧をモーダルではなくページで表示する
    const [isFriendsPage, setIsFriendsPage] = useState(false);
    // 友達候補（候補リストはモーダルで表示）
    const [isCandidatesOpen, setIsCandidatesOpen] = useState(false);

    // 進捗モーダル（Group コンポーネント側で管理）
    const [isProgressOpen, setIsProgressOpen] = useState(false);
    const [progressGroup, setProgressGroup] = useState<GroupType | null>(null);
    const openProgressFor = (g: GroupType) => { setProgressGroup(g); setIsProgressOpen(true); };
    const closeProgress = () => { setProgressGroup(null); setIsProgressOpen(false); };

    const GroupProgressModal: React.FC<{ group: GroupType; onClose: () => void }> = ({ group, onClose }) => {
      const weekdayNames = ['日','月','火','水','木','金','土'];
      const getMemberProfile = (memberId: string) => allUserProfiles.get(memberId) || { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
      const isHabitScheduledForDateLocal = (habit: Habit, date: Date) => {
        const d = new Date(date); d.setHours(0,0,0,0);
        const s = new Date((habit as any).startDate || habit.startDate); s.setHours(0,0,0,0);
        if (d < s) return false;
        if ((habit as any).frequencyType === 'daily') return true;
        if ((habit as any).frequencyType === 'weekly') return Array.isArray((habit as any).frequencyValue) && (habit as any).frequencyValue.includes(d.getDay());
        if ((habit as any).frequencyType === 'monthly') return Array.isArray((habit as any).frequencyValue) && (habit as any).frequencyValue.includes(d.getDate());
        return false;
      };
      const today = new Date();
      const todayStr = today.toLocaleDateString('sv-SE');

      const getMemberProgress = (memberId: string) => {
        const today = new Date();
        if (memberId === profile.id) {
          return calculateCompletionPercentForDate(today, habits);
        }
        const sharedForMember: string[] = (group as any).sharedByMember?.[memberId] || (group as any).sharedHabitIds || [];
        if (!sharedForMember || sharedForMember.length === 0) return null;
        const memberProfile = allUserProfiles.get(memberId) as any;
        const memberHabits: Habit[] = (memberProfile && memberProfile.habits) || [];
        if (!memberHabits || memberHabits.length === 0) return null;
        const sharedHabits = memberHabits.filter(h => sharedForMember.includes(h.id));
        if (sharedHabits.length === 0) return 0;
        return calculateCompletionPercentForDate(today, sharedHabits);
      };

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]" onClick={onClose}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">{group.name} の今日の進捗</h3>
              <button onClick={onClose} className="text-gray-500">閉じる</button>
            </div>
            <div className="space-y-3">
              {group.members.map(memberId => {
                const member = getMemberProfile(memberId);
                const progress = getMemberProgress(memberId);
                const isSelf = memberId === profile.id;
                return (
                  <div key={memberId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={member.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} alt={member.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                      <div>
                        <div className="font-semibold text-gray-800">{member.displayName}{isSelf ? ' (自分)' : ''}</div>
                      </div>
                    </div>
                    <div className="w-28 text-right">
                      {progress === null ? <span className="text-sm text-gray-400">-</span> : <span className="font-bold text-indigo-600">{progress}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

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
      return (
        <GroupDetail 
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
        />
      );
    }

    // --- フォロー中の友達ページ（モーダルではなくページ遷移で表示） ---
    if (isFriendsPage) {
        const followingIds = new Set(following.map(f => f.id));
        const candidates = followers.filter(f => !followingIds.has(f.id));
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsFriendsPage(false)} className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">フォロー中の友達</h2>
                    <div className="flex-1" />
                    <button onClick={() => setIsCandidatesOpen(true)} className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                        {/* リストアイコン */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        友達候補
                    </button>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">フォロー中の友達 ({following.length})</h3>
                    </div>
                    <div className="space-y-2">
                        {following.length === 0 ? (
                            <div className="text-sm text-gray-500">フォロー中の友達がいません。</div>
                        ) : (
                            following.map(f => (
                                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                                    <img src={f.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} alt={f.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800">{f.displayName}</div>
                                        {/* ID は個人情報のため表示しない */}
                                    </div>
                                    <div className="text-sm text-gray-600">{/* 追加情報があれば */}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 友達候補のモーダル */}
                {isCandidatesOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]" onClick={() => setIsCandidatesOpen(false)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold">友達候補 ({candidates.length})</h3>
                                <button onClick={() => setIsCandidatesOpen(false)} className="text-gray-500">閉じる</button>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {candidates.length === 0 ? (
                                    <p className="text-sm text-gray-500">候補が見つかりません。</p>
                                ) : (
                                    candidates.map(c => (
                                        <div key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                                            <img src={c.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} alt={c.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{c.displayName}</div>
                                                <div className="text-xs text-gray-500">{c.id}</div>
                                            </div>
                                            <button onClick={() => onFollowUser(c.id)} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm">フォロー</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* フォロー中の友達プレビュー（クリックでページ遷移） */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800">フォロー中の友達</h3>
                    <button onClick={() => setIsFriendsPage(true)} className="text-sm text-gray-500 hover:text-indigo-600">一覧</button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {following.slice(0, 8).map(f => (
                            <img key={f.id}
                                 src={f.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                                 alt={f.displayName}
                                 className="w-8 h-8 rounded-full ring-2 ring-white object-cover bg-gray-200" />
                        ))}
                        {following.length > 8 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 ring-2 ring-white">+{following.length - 8}</div>
                        )}
                    </div>
                    <div className="text-sm text-gray-600">{following.length} 人</div>
                    <div className="flex-1" />
                    <button onClick={() => setIsFriendsPage(true)} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">表示</button>
                </div>
            </div>

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
                                          className="w-8 h-8 rounded-full ring-2 ring-white object-cover bg-gray-200"
                                        />
                                      );
                                  })}
                              </div>
                              <span className="ml-3 text-sm text-gray-500">{group.members.length}人のメンバー</span>
                              <div className="flex-1" />
                              <button
                                onClick={(e) => { e.stopPropagation(); openProgressFor(group); }}
                                className="ml-3 px-3 py-1 bg-white border border-gray-200 rounded-md text-sm text-indigo-600 hover:bg-indigo-50"
                              >
                                進捗
                              </button>
                          </div>
                      </div>
                  ))}
                  {isProgressOpen && progressGroup && <GroupProgressModal group={progressGroup} onClose={closeProgress} />}
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