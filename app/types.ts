// types.ts

// FIX: Defined all necessary types and interfaces for the application.
// This file should only contain type definitions.

export type EnergyCategory = 'physical' | 'mental' | 'emotional' | 'intellectual';

export type FrequencyType = 'daily' | 'weekly' | 'monthly';

export type View = 'diagnosis' | 'habits' | 'analytics' | 'group' | 'records';

export interface Question {
  id: string;
  text: string;
  isReversed: boolean;
}

export type EnergyQuestionnaire = {
  [key in EnergyCategory]: Question[];
};

export interface Advice {
  title: string;
  points: string[];
}

export type EnergyScores = {
  [key in EnergyCategory]: number;
};

export type EnergyRecord = {
  date: string;
} & EnergyScores;

export interface Habit {
  id: string;
  name: string;
  completedDates: string[];
  startDate: string;
  frequencyType: FrequencyType;
  frequencyValue: number[];
}

export interface Profile {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

export interface DiagnosisFrequency {
  frequencyType: FrequencyType;
  frequencyValue: number[];
}

export interface Friend {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

// ★★★ ここが修正点 ★★★
export interface Group {
  id: string;
  ownerId: string; // ★ この行を追加しました (オーナーのID)
  name: string;
  members: string[]; // array of profile IDs
}
// ★★★ 修正点ここまで ★★★

export interface Comment {
    id: string;
    groupId: string;
    authorId: string;
    authorName: string;
    text: string;
    timestamp: string;
}