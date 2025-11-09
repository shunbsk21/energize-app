"use client";

import React, { useState, useMemo } from 'react';
import { Profile, Friend, Group as GroupType, Comment, Habit } from './types';

// ★★★ Propsの定義を
interface GroupProps {
    profile: Profile;
    friends: Friend[];
    onAddFriend: (friendId: string) => void; // ★ 修正
    groups: GroupType[];
    onAddGroup: (newGroupData: Omit<GroupType, 'id'>) => void;
    onUpdateGroup: (updatedGroup: GroupType) => void;
    comments: Comment[];
    onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
    habits: Habit[];
    setIsHelpOpen: (isOpen: boolean) => void;
    allUserProfiles: Map<string, Profile | Friend>; // ★ 追加
}

// (↓ isHabitScheduledForDate は変更なし)
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
            return habit.frequencyValue.includes(targetDate.getDay());
        case 'monthly':
            return habit.frequencyValue.includes(targetDate.getDate());
        default:
            return false;
    }
};

// (↓ アイコンコンポーネントは変更なし)
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

// ★ AddFriendInline の Props を修正
const AddFriendInline: React.FC<{
    profile: Profile;
    friends: Friend[];
    onAddFriend: (friendId: string) => void; // ★ 修正
}> = ({ profile, friends, onAddFriend }) => {
    const [friendId, setFriendId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleAddFriend = () => {
        if (!friendId.trim()) {
            setError('ユーザーIDを入力してください。');
            return;
        }
        if (friendId.trim() === profile.id) {
            setError('自分自身を友達として追加することはできません。');
            return;
        }
        if (friends.some(f => f.id === friendId.trim())) {
            setError('このユーザーは既に友達です。');
            return;
        }

        // ★ MainApp の onAddFriend に「IDだけ」を渡す
        onAddFriend(friendId.trim());

        setError('');
        setFriendId('');
        setSuccess(`友達追加リクエストを送信しました！`);
        setTimeout(() => setSuccess(''), 3000);
    };

    return (
        <div className="p-3 bg-gray-100 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">友達をIDで追加</label>
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


// ★ CreateGroupModal の Props を修正
const CreateGroupModal: React.FC<{
    profile: Profile;
    friends: Friend[];
    onAddFriend: (friendId: string) => void; // ★ 修正
    onClose: () => void;
    onCreate: (name: string, members: string[]) => void;
}> = ({ profile, friends, onAddFriend, onClose, onCreate }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const toggleFriend = (friendId: string) => {
        setSelectedFriends(prev => {
            const newSet = new Set(prev);
            if (newSet.has(friendId)) {
                newSet.delete(friendId);
            } else {
                newSet.add(friendId);
            }
            return newSet;
        });
    };

    const handleCreate = () => {
        if (!groupName.trim()) {
            setError('グループ名を入力してください。');
            return;
        }
        onCreate(groupName, [profile.id, ...Array.from(selectedFriends)]);
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
                        <h3 className="text-sm font-medium text-gray-700 mb-2">メンバーを招待</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                            {friends.length > 0 ? friends.map(friend => (
                                <div key={friend.id} onClick={() => toggleFriend(friend.id)} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedFriends.has(friend.id) ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                                    <input type="checkbox" checked={selectedFriends.has(friend.id)} readOnly className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                    {/* ★ 友達の本当の表示名を使う */}
                                    <img src={friend.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
                                    <span className="ml-2 text-gray-800">{friend.displayName}</span>
                                </div>
                            )) : <p className="text-center text-sm text-gray-500 py-4">まず友達を追加しましょう</p>}
                        </div>
                    </div>
                    <AddFriendInline profile={profile} friends={friends} onAddFriend={onAddFriend} />
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                    <button type="button" onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow">作成</button>
                </div>
            </div>
        </div>
    );
};

// ★ InviteMemberModal の Props を修正
const InviteMemberModal: React.FC<{
    group: GroupType;
    profile: Profile;
    friends: Friend[];
    onAddFriend: (friendId: string) => void; // ★ 修正
    onClose: () => void;
    onInvite: (memberIds: string[]) => void;
}> = ({ group, profile, friends, onAddFriend, onClose, onInvite }) => {
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

    const availableFriends = useMemo(() => {
        const memberIds = new Set(group.members);
        return friends.filter(f => !memberIds.has(f.id));
    }, [friends, group.members]);

    const toggleFriend = (friendId: string) => {
        setSelectedFriends(prev => {
            const newSet = new Set(prev);
            if (newSet.has(friendId)) {
                newSet.delete(friendId);
            } else {
                newSet.add(friendId);
            }
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
                                {/* ★ 友達の本当の表示名を使う */}
                                <img src={friend.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={friend.displayName} className="w-6 h-6 rounded-full object-cover bg-gray-200 ml-3" />
                                <span className="ml-2 text-gray-800">{friend.displayName}</span>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">招待できる友達がいません。</p>
                        )}
                    </div>
                    <AddFriendInline profile={profile} friends={friends} onAddFriend={onAddFriend} />
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                    <button type="button" onClick={handleInvite} disabled={selectedFriends.size === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow disabled:bg-gray-400">招待</button>
                </div>
            </div>
        </div>
    );
};


// ★ GroupDetail の Props を修正
const GroupDetail: React.FC<{
    group: GroupType;
    profile: Profile;
    friends: Friend[];
    onAddFriend: (friendId: string) => void; // ★ 修正
    comments: Comment[];
    onAddComment: (newCommentData: Omit<Comment, 'id'>) => void;
    habits: Habit[];
    onBack: () => void;
    onInviteMembers: (groupId: string, memberIds: string[]) => void;
    allUserProfiles: Map<string, Profile | Friend>; // ★ 追加
}> = ({ group, profile, friends, onAddFriend, comments, onAddComment, habits, onBack, onInviteMembers, allUserProfiles }) => {
    const [newComment, setNewComment] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // ★ allUserProfiles は props から受け取るので useMemo を削除
    // const allUsers = useMemo(() => [profile, ...friends], [profile, friends]);

    const groupComments = useMemo(() => comments.filter(c => c.groupId === group.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [comments, group.id]);

    // ★★★ getMemberProfile を修正 ★★★
    const getMemberProfile = (memberId: string) => {
        // MainApp から渡された allUserProfiles マップから探す
        return allUserProfiles.get(memberId) || { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
    };

    // (↓ getMemberProgress は変更なし)
    const getMemberProgress = (memberId: string) => {
        if (memberId === profile.id) {
            const today = new Date();
            const todayStr = today.toLocaleDateString('sv-SE');
            const scheduled = habits.filter(h => isHabitScheduledForDate(h, today));
            if(scheduled.length === 0) return 0;
            const completed = scheduled.filter(h => h.completedDates.includes(todayStr)).length;
            return Math.round((completed / scheduled.length) * 100);
        }
        // 他のメンバーの進捗は、当面はダミーデータ（ハッシュ）で表示
        let hash = 0;
        for (let i = 0; i < memberId.length; i++) {
            hash = memberId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const progress = (new Date().getDate() * hash) % 70 + 30; // 30-100%
        return Math.abs(progress);
    };

    // (↓ handlePostComment は変更なし)
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

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <h2 className="text-2xl font-bold text-gray-800">{group.name}</h2>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">今日の進捗</h3>
                    <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold p-2 rounded-md hover:bg-indigo-50">
                        <UserPlusIcon className="w-5 h-5" />
                        招待する
                    </button>
                </div>
                {/* ★ メンバー進捗表示 (getMemberProfile が修正されたので、自動的に正しい名前が表示される) */}
                <div className="space-y-4">
                    {group.members.map(memberId => {
                        const member = getMemberProfile(memberId);
                        const progress = getMemberProgress(memberId);
                        return (
                            <div key={memberId} className="flex items-center gap-4">
                                <img src={member.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} alt={member.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-700">{member.displayName}</span>
                                        <span className="font-bold text-indigo-600">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-indigo-500 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">コメント</h3>
                {/* (↓ コメント表示 ... 変更なし) */}
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-4">
                    {groupComments.map(comment => {
                        const isAuthor = comment.authorId === profile.id;
                        return (
                             <div key={comment.id} className={`flex ${isAuthor ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isAuthor ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                    {/* ★ コメント投稿者の名前も allUserProfiles から引く */}
                                    {!isAuthor && <p className="text-xs font-bold text-indigo-600">{allUserProfiles.get(comment.authorId)?.displayName || '名無しのさん'}</p>}
                                    <p className="text-sm">{comment.text}</p>
                                    <p className={`text-xs mt-1 ${isAuthor ? 'text-indigo-200' : 'text-gray-400'} text-right`}>{new Date(comment.timestamp).toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* (↓ コメント入力 ... 変更なし) */}
                <div className="flex items-center gap-2">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="コメントを入力..." onKeyPress={e => e.key === 'Enter' && handlePostComment()} className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"/>
                    <button onClick={handlePostComment} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            {isInviteModalOpen && (
                <InviteMemberModal
                    group={group}
                    profile={profile}
                    friends={friends}
                    onAddFriend={onAddFriend} // ★ 修正
                    onClose={() => setIsInviteModalOpen(false)}
                    onInvite={(memberIds) => onInviteMembers(group.id, memberIds)}
                />
            )}
        </div>
    );
};


// ★ Group (本体) の Props を修正
const Group: React.FC<GroupProps> = ({ 
    profile, 
    friends, 
    onAddFriend, // ★ 修正
    groups, 
    onAddGroup,
    onUpdateGroup,
    comments, 
    onAddComment,
    habits, 
    setIsHelpOpen,
    allUserProfiles // ★ 追加
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

    // (↓ handleCreateGroup, handleInviteMembers は変更なし)
    const handleCreateGroup = (name: string, members: string[]) => {
        const newGroupData: Omit<GroupType, 'id'> = {
            name,
            members
        };
        onAddGroup(newGroupData);
    };
    
    const handleInviteMembers = (groupId: string, memberIds: string[]) => {
        const groupToUpdate = groups.find(g => g.id === groupId);
        if (!groupToUpdate) return;
        const updatedGroup: GroupType = { 
            ...groupToUpdate, 
            members: [...new Set([...groupToUpdate.members, ...memberIds])] 
        };
        onUpdateGroup(updatedGroup);
        setSelectedGroup(prev => prev ? updatedGroup : null)
    };

    if (selectedGroup) {
        return <GroupDetail 
                    group={selectedGroup} 
                    profile={profile} 
                    friends={friends} 
                    onAddFriend={onAddFriend} // ★ 修正
                    comments={comments} 
                    onAddComment={onAddComment}
                    habits={habits} 
                    onBack={() => setSelectedGroup(null)} 
                    onInviteMembers={handleInviteMembers}
                    allUserProfiles={allUserProfiles} // ★ 追加
                />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-gray-800">グループ</h2>
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
            {/* ★ グループ一覧表示 (allUserProfiles を使うように修正) */}
            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group.id} onClick={() => setSelectedGroup(group)} className="bg-white p-4 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                        <div className="flex items-center mt-2">
                            <div className="flex -space-x-2">
                                {group.members.slice(0,5).map(memberId => {
                                    // ★ allUserProfiles マップからメンバー情報を取得
                                    const member = allUserProfiles.get(memberId);
                                    return (
                                        <img key={memberId} 
                                             src={member?.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJoLTYgdy02IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTUuMTIxIDE3LjgwNEExMy45MzcgMTMuOTM3IDAgMDExMiAxNmMzLjUgMCA2Ljg0Ny42NTUgNi44NzkgMS44MDRNMTUgMTBhMyAzIDAgMTEtNiAwIDMgMyAwIDAxNiAweiIgLz48L3N2Zz4='} 
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
                    <p>新しいグループを作成して友達と進捗を共有しましょう！</p>
                </div>
            )}

            {isCreateOpen && <CreateGroupModal 
                                profile={profile} 
                                friends={friends} 
                                onAddFriend={onAddFriend} // ★ 修正
                                onClose={() => setIsCreateOpen(false)} 
                                onCreate={handleCreateGroup} 
                            />}
        </div>
    );
};

export default Group;