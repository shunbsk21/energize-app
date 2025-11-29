import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Profile, Habit, Group as GroupType } from '../types';

interface AppContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  groups: GroupType[];
  setGroups: (groups: GroupType[]) => void;
  // 他のグローバルな状態もここに追加できます
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);

  const value = {
    profile,
    setProfile,
    habits,
    setHabits,
    groups,
    setGroups,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};