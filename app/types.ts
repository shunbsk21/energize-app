// types.ts

// FIX: Defined all necessary types and interfaces for the application.
// This file should only contain type definitions.

export type EnergyCategory = 'physical' | 'mental' | 'emotional' | 'intellectual';

export type FrequencyType = 'daily' | 'weekly' | 'monthly';

export type View = 'diagnosis' | 'personality' | 'purelife' | 'habits' | 'analytics' | 'records' | 'groups' | 'tasks' | 'notes' | 'learnings';

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
  // 実施タイプ: 'binary' = 1回でも実施 / 'amount' = 規定量の実施
  type: 'binary' | 'amount';
  // binary 用: 実施日リスト（既存の挙動）
  completedDates: string[];
  // amount 用: 日付 -> 実施量 を保存
  completedAmounts?: { [date: string]: number };
  // amount 用の目標値 / 単位（例: target=10, unit='km'）
  target?: number;
  unit?: string;
  details?: string;
  skippedDates?: string[];
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