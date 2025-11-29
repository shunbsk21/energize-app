export type View =
  | 'diagnosis'
  | 'personality'
  | 'purelife'
  | 'value'
  | 'habits'
  | 'groups'
  | 'records'
  | 'analytics'
  | 'notifications'
  | 'tasks'
  | 'notes'
  | 'learnings';

export type DriverKey = 'ACH' | 'CRE' | 'CON' | 'SEC' | 'TRU' | 'JOY';

export interface Profile {
  id: string;
  displayName?: string;
  imageUrl?: string | null;
}

export type EnergyCategory = string;

export interface EnergyRecord {
  date: string;
  [k: string]: any;
}

export interface Habit {
  id?: string;
  title: string;
  detail?: string;
  createdAt?: string;
}

export interface EnergyScores {
  [k: string]: number;
}

export interface DiagnosisFrequency {
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequencyValue?: any[];
}

export interface Friend {
  id: string;
  displayName?: string;
  imageUrl?: string | null;
}

export interface Group {
  id?: string;
  name?: string;
  members: string[];
  ownerId?: string;
  sharedByMember?: Record<string, string[]>;
}

export interface Comment {
  id?: string;
  groupId: string;
  text: string;
  authorId?: string;
  authorName?: string;
  authorImageUrl?: string | null;
  createdAt?: string;
}

export interface Notification {
  id?: string;
  groupId?: string | null;
  groupName?: string | null;
  message?: string | null;
  authorName?: string | null;
  createdAt?: any;
  isRead?: boolean;
}