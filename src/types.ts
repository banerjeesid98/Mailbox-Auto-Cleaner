export type EmailCategory = 'spam' | 'trash' | 'promotions' | 'social' | 'updates' | 'primary_targeted';

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category: EmailCategory;
  categoryLabel: string;
  ageInDays: number;
}

export interface CleanerRules {
  olderThanDays: number; // default: 0
  cleanInbox?: boolean;
  cleanSpam: boolean;
  cleanTrash: boolean;
  cleanPromotions: boolean;
  cleanSocial: boolean;
  cleanUpdates: boolean;
  targetPrimarySenders: string[]; // e.g. ["Amazon", "Magic Pin", "unsubscribe", "newsletter"]
  customQuery?: string; // e.g. "in:inbox" or "is:unread"
  deleteMode: 'trash' | 'permanent';
  autoScheduleEnabled: boolean;
  autoScheduleFrequencyDays: number; // e.g. 7 for weekly auto runs
  lastAutoRunDate?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  weekKey: string; // e.g., "2026-W30"
  weekLabel: string; // e.g., "Jul 20 - Jul 26, 2026"
  messagesRemovedCount: number;
  breakdown: Record<EmailCategory, number>;
  removedMessages: EmailMessage[];
  status: 'success' | 'partial' | 'failed';
  triggeredBy: 'manual' | 'scheduled';
  note?: string;
}

export interface WeeklyReport {
  weekKey: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalRemoved: number;
  runsCount: number;
  categoryBreakdown: Record<EmailCategory, number>;
  topSenders: { sender: string; count: number }[];
  logs: LogEntry[];
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL?: string;
}
