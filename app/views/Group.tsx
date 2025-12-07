"use client";

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { Profile, Friend, Group as GroupType, Comment, Habit, GroupProps } from '../types';
import GroupDetail from '../views/GroupDetail';
import CreateGroupModal from '../components/CreateGroupModal';
import { GroupProgressModal } from '../components/GroupProgressModal';
import { HelpIcon, PlusIcon, ChevronLeftIcon } from '../components/Icons';

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
  onUpdateGroupSharedHabits,
  selectedGroupId,
  onClearSelectedGroup,
  onDeleteGroup
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  // ページ内遷移用：フォロー中の友達一覧をモーダルではなくページで表示する
  const [isFriendsPage, setIsFriendsPage] = useState(false);
  // 友達候補（候補リストはモーダルで表示）
  const [isCandidatesOpen, setIsCandidatesOpen] = useState(false);

  // ★ 通知クリックからの遷移処理
  useEffect(() => {
    // selectedGroupId が渡され、グループリストが読み込み済みの場合に実行
    if (selectedGroupId && groups.length > 0) {
      const groupToSelect = groups.find(g => g.id === selectedGroupId);
      if (groupToSelect) {
        setSelectedGroup(groupToSelect);
      }
      // 処理が終わったら親コンポーネントのIDをクリアする
      onClearSelectedGroup();
    }
  }, [selectedGroupId, groups, onClearSelectedGroup]);

  // 進捗モーダル（Group コンポーネント側で管理）
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressGroup, setProgressGroup] = useState<GroupType | null>(null);
  const closeProgress = () => { setProgressGroup(null); setIsProgressOpen(false); };

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
        onDeleteGroup={onDeleteGroup}
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
            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {following.length === 0 ? (
              <div className="text-sm text-gray-500">フォロー中の友達がいません。</div>
            ) : (
              following.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <Image
                    src={f.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'}
                    alt={f.displayName ?? ''}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover bg-gray-200"
                  />
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
                      <Image
                        src={c.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'}
                        alt={c.displayName ?? ''}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover bg-gray-200"
                      />
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
              <Image
                key={f.id}
                src={f.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                alt={f.displayName ?? ''}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full ring-2 ring-white object-cover bg-gray-200"
              />
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
          <PlusIcon className="w-5 h-5" />
          <span>作成</span>
        </button>
      </div>

      {groupInvites.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4">未承認のグループ</h3>
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
                    承諾
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">承認済みグループ</h3>
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id} onClick={() => setSelectedGroup(group)} className="p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-indigo-400 transition-colors">
              <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
              <div className="flex items-center mt-2">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 5).map(memberId => {
                    const member = allUserProfiles.get(memberId);
                    return (
                      <Image
                        key={memberId}
                        src={member?.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'}
                        alt={member?.displayName ?? 'member'}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full ring-2 ring-white object-cover bg-gray-200" />
                    );
                  })}
                </div>
                <span className="ml-3 text-sm text-gray-500">{group.members.length}人</span>
                <div className="flex-1" />
              </div>
            </div>
          ))}
          {isProgressOpen && progressGroup && <GroupProgressModal
            group={progressGroup}
            profile={profile}
            habits={habits}
            allUserProfiles={allUserProfiles}
            onClose={closeProgress}
          />}
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