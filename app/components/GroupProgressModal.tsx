"use client";

import Image from 'next/image';
import React from 'react';
import { Profile, Friend, Group as GroupType, Habit } from '../types';
import { calculateCompletionPercentForDate } from '../utils/habits';

export const GroupProgressModal: React.FC<{
  group: GroupType;
  profile: Profile;
  habits: Habit[];
  allUserProfiles: Map<string, Profile | Friend>;
  onClose: () => void;
}> = ({ group, profile, habits, allUserProfiles, onClose }) => {
  const getMemberProfile = (memberId: string) => allUserProfiles.get(memberId) || { id: memberId, displayName: `ユーザー ${memberId.substring(0,4)}`, imageUrl: null };
  
  const getMemberProgress = (memberId: string) => {
    const today = new Date();
    if (memberId === profile.id) {
      return calculateCompletionPercentForDate(today, habits);
    }
    const sharedForMember: string[] = (group.sharedByMember?.[memberId]) || group.sharedHabitIds || [];
    if (!sharedForMember || sharedForMember.length === 0) return null;
    const memberProfile = allUserProfiles.get(memberId);
    const memberHabits: Habit[] = memberProfile?.habits || [];
    if (!memberHabits || memberHabits.length === 0) return null;
    const sharedHabits = memberHabits.filter(h => h.id && sharedForMember.includes(h.id));
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
                  <Image 
                    src={member.imageUrl ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>'} 
                    alt={member.displayName ?? ''} 
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover bg-gray-200" 
                  />
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