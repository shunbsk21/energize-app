import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Habit, Group, Comment, Profile, Friend, DiagnosisFrequency, Task, Checkin, Checkout, LearningItem } from '../types';

/**
 * 習慣を追加する
 */
export const addHabit = async (userId: string, newHabitData: Omit<Habit, 'id'>): Promise<Habit> => {
  const habitsRef = collection(db, 'users', userId, 'habits');
  const toSave = Object.fromEntries(Object.entries(newHabitData).filter(([, v]) => v !== undefined));
  const docRef = await addDoc(habitsRef, toSave);
  return { ...(toSave as Omit<Habit, 'id'>), id: docRef.id };
};

/**
 * 習慣を更新する
 */
export const updateHabit = async (userId: string, updatedHabit: Habit): Promise<void> => {
  const habitRef = doc(db, 'users', userId, 'habits', updatedHabit.id);
  const { id, ...dataToSave } = updatedHabit;
  await setDoc(habitRef, dataToSave);
};

/**
 * 習慣を削除する
 */
export const deleteHabit = async (userId: string, habitId: string): Promise<void> => {
  const habitRef = doc(db, 'users', userId, 'habits', habitId);
  await deleteDoc(habitRef);
};

/**
 * ユーザーをフォローする
 */
export const followUser = async (myId: string, myProfile: Profile, friendId: string, friendProfile: Profile | Friend): Promise<void> => {
  const friendData: Omit<Friend, 'id'> = {
    displayName: friendProfile.displayName,
    imageUrl: friendProfile.imageUrl,
  };
  const followingRef = doc(db, 'users', myId, 'following', friendId);
  await setDoc(followingRef, friendData);

  const myProfileDataForFollower: Omit<Friend, 'id'> = {
    displayName: myProfile.displayName,
    imageUrl: myProfile.imageUrl,
  };
  const myRefOnFollowerList = doc(db, 'users', friendId, 'followers', myId);
  await setDoc(myRefOnFollowerList, myProfileDataForFollower);
};

/**
 * グループを作成し、メンバーを招待する
 */
export const createGroup = async (userId: string, newGroupData: Omit<Group, 'id'>): Promise<Group> => {
  const newGroupRef = doc(collection(db, 'users', userId, 'groups'));
  const newGroupId = newGroupRef.id;
  const groupDocWithId: Group = {
    ...newGroupData,
    id: newGroupId,
    ownerId: userId,
  };
  const { id, ...dataToSave } = groupDocWithId;

  for (const memberId of newGroupData.members) {
    if (memberId === userId) {
      const groupRefForMe = doc(db, 'users', userId, 'groups', newGroupId);
      await setDoc(groupRefForMe, dataToSave);
    } else {
      const inviteRef = doc(db, 'users', memberId, 'group_invites', newGroupId);
      await setDoc(inviteRef, dataToSave);
    }
  }
  return groupDocWithId;
};

/**
 * グループにメンバーを招待する
 */
export const inviteToGroup = async (group: Group, memberIdsToInvite: string[]): Promise<void> => {
  const updatedMembers = [...new Set([...group.members, ...memberIdsToInvite])];
  const updatedGroupData: Group = { ...group, members: updatedMembers };
  const { id, ...dataToSave } = updatedGroupData;

  for (const newMemberId of memberIdsToInvite) {
    if (group.members.includes(newMemberId)) continue;
    const inviteRef = doc(db, 'users', newMemberId, 'group_invites', group.id);
    await setDoc(inviteRef, dataToSave);
  }
  for (const existingMemberId of group.members) {
    const groupRef = doc(db, 'users', existingMemberId, 'groups', group.id);
    await setDoc(groupRef, dataToSave);
  }
};

/**
 * グループからメンバーを削除する
 */
export const removeMemberFromGroup = async (group: Group, memberIdToRemove: string): Promise<void> => {
  const updatedMembers = group.members.filter(id => id !== memberIdToRemove);
  const updatedGroupData: Group = { ...group, members: updatedMembers };
  const { id, ...dataToSave } = updatedGroupData;

  const memberGroupRef = doc(db, 'users', memberIdToRemove, 'groups', group.id);
  await deleteDoc(memberGroupRef);

  for (const memberId of updatedMembers) {
    const groupRef = doc(db, 'users', memberId, 'groups', group.id);
    await setDoc(groupRef, dataToSave);
  }
};

/**
 * グループへの招待を承認する
 */
export const acceptGroupInvite = async (userId: string, invite: Group): Promise<void> => {
  const groupRef = doc(db, 'users', userId, 'groups', invite.id);
  const { id, ...dataToSave } = invite;
  await setDoc(groupRef, dataToSave);

  const inviteRef = doc(db, 'users', userId, 'group_invites', invite.id);
  await deleteDoc(inviteRef);
};

/**
 * グループへの招待を拒否する
 */
export const declineGroupInvite = async (userId: string, inviteId: string): Promise<void> => {
  const inviteRef = doc(db, 'users', userId, 'group_invites', inviteId);
  await deleteDoc(inviteRef);
};

/**
 * グループチャットにコメントを投稿する
 */
export const addCommentToGroup = async (newCommentData: Omit<Comment, 'id'>): Promise<void> => {
  const commentsRef = collection(db, 'group_chats', newCommentData.groupId, 'messages');
  await addDoc(commentsRef, newCommentData);
};

/**
 * 診断の頻度設定を保存する
 */
export const saveDiagnosisFrequency = async (userId: string, newFrequency: DiagnosisFrequency): Promise<void> => {
  const settingsRef = doc(db, 'users', userId, 'settings', 'main');
  await setDoc(settingsRef, { diagnosisFrequency: newFrequency }, { merge: true });
};

/**
 * プロフィール情報を保存する
 */
export const saveProfile = async (userId: string, newDisplayName: string, newImageUrl: string | null): Promise<void> => {
  const settingsRef = doc(db, 'users', userId, 'settings', 'main');
  await setDoc(settingsRef, {
    profile: {
      displayName: newDisplayName,
      imageUrl: newImageUrl,
    },
  }, { merge: true });
};

/**
 * グループでの共有習慣設定を更新する
 */
export const updateGroupSharedHabits = async (userId: string, groupId: string, memberId: string, sharedIds: string[]): Promise<void> => {
  const groupRef = doc(db, 'users', userId, 'groups', groupId);
  try {
    await updateDoc(groupRef, { [`sharedByMember.${memberId}`]: sharedIds });
  } catch (err) {
    await setDoc(groupRef, { sharedByMember: { [memberId]: sharedIds } }, { merge: true });
  }
};

/**
 * タスクを追加する
 */
export const addTask = async (userId: string, payload: { title: string; details?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }): Promise<Task> => {
  const ref = collection(db, 'users', userId, 'tasks');
  const docRef = await addDoc(ref, { ...payload, done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return { id: docRef.id, ...payload, done: false };
};

/**
 * タスクの完了状態を切り替える
 */
export const toggleTask = async (userId: string, taskId: string, done: boolean): Promise<Partial<Task>> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const updatePayload: Partial<Task> = { done, updatedAt: new Date().toISOString() };
  if (done) {
    updatePayload.completedAt = new Date().toISOString();
  } else {
    updatePayload.completedAt = null;
  }
  await updateDoc(taskRef, updatePayload);
  return updatePayload;
};

/**
 * タスクを更新する
 */
export const updateTask = async (userId: string, taskId: string, payload: Partial<Omit<Task, 'id'>>): Promise<void> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const updatePayload = { ...payload, updatedAt: new Date().toISOString() };
  await updateDoc(taskRef, updatePayload);
};

/**
 * タスクを削除する
 */
export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskRef);
};