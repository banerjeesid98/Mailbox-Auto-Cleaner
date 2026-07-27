import { CleanerRules, EmailCategory, EmailMessage, LogEntry, WeeklyReport } from '../types';

const RULES_STORAGE_KEY = 'gmail_auto_cleaner_rules_v1';
const LOGS_STORAGE_KEY = 'gmail_auto_cleaner_logs_v1';

export const DEFAULT_RULES: CleanerRules = {
  olderThanDays: 0,
  cleanInbox: false, // Default false: Main/Primary inbox protected!
  cleanSpam: false,
  cleanTrash: false,
  cleanPromotions: true,
  cleanSocial: true,
  cleanUpdates: true,
  targetPrimarySenders: ['Amazon', 'MagicBricks', 'Zomato', 'PolicyBazaar', 'unsubscribe', 'newsletter'],
  customQuery: '',
  deleteMode: 'trash',
  autoScheduleEnabled: true,
  autoScheduleFrequencyDays: 7,
};

export function loadRules(): CleanerRules {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_RULES,
        ...parsed,
        cleanInbox: parsed.cleanInbox === true, // Default to false unless explicitly set to true in saved rules
        targetPrimarySenders:
          parsed.targetPrimarySenders && parsed.targetPrimarySenders.length > 0
            ? parsed.targetPrimarySenders
            : DEFAULT_RULES.targetPrimarySenders,
      };
    }
  } catch (err) {
    console.error('Failed to load cleaner rules:', err);
  }
  return DEFAULT_RULES;
}

export function saveRules(rules: CleanerRules): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save cleaner rules:', err);
  }
}

/**
 * Calculates ISO Week Number and Week Key (e.g., "2026-W30")
 */
export function getISOWeekInfo(dateInput: Date = new Date()): { weekKey: string; weekLabel: string; startDate: string; endDate: string } {
  const d = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  
  const weekKey = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;

  // Start of week (Monday)
  const monday = new Date(dateInput);
  const day = monday.getDay();
  const diffToMonday = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diffToMonday);

  // End of week (Sunday)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatShort = (dt: Date) =>
    dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const weekLabel = `Week ${weekNo} (${formatShort(monday)} - ${formatShort(sunday)})`;

  return {
    weekKey,
    weekLabel,
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
  };
}

export function loadLogEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      const entries: LogEntry[] = JSON.parse(raw);
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  } catch (err) {
    console.error('Failed to load log entries:', err);
  }
  return [];
}

export function saveLogEntry(entry: LogEntry): LogEntry[] {
  const existing = loadLogEntries();
  const updated = [entry, ...existing];
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save log entry:', err);
  }
  return updated;
}

export function clearLogEntries(): void {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear log entries:', err);
  }
}

/**
 * Aggregates individual log entries into structured Weekly Reports
 */
export function buildWeeklyReports(logs: LogEntry[]): WeeklyReport[] {
  const map = new Map<string, WeeklyReport>();

  for (const log of logs) {
    const { weekKey, weekLabel } = getISOWeekInfo(new Date(log.timestamp));
    
    let report = map.get(weekKey);
    if (!report) {
      report = {
        weekKey,
        weekLabel: log.weekLabel || weekLabel,
        startDate: log.timestamp,
        endDate: log.timestamp,
        totalRemoved: 0,
        runsCount: 0,
        categoryBreakdown: {
          spam: 0,
          trash: 0,
          promotions: 0,
          social: 0,
          updates: 0,
          primary_targeted: 0,
        },
        topSenders: [],
        logs: [],
      };
      map.set(weekKey, report);
    }

    report.totalRemoved += log.messagesRemovedCount;
    report.runsCount += 1;
    report.logs.push(log);

    // Aggregate category breakdown
    if (log.breakdown) {
      (Object.keys(log.breakdown) as EmailCategory[]).forEach((cat) => {
        report!.categoryBreakdown[cat] = (report!.categoryBreakdown[cat] || 0) + (log.breakdown[cat] || 0);
      });
    }
  }

  // Calculate top senders for each week
  const reports = Array.from(map.values()).map((rep) => {
    const senderCounts: Record<string, number> = {};
    rep.logs.forEach((l) => {
      l.removedMessages?.forEach((msg) => {
        const cleanFrom = msg.from.replace(/<.*>/, '').trim() || msg.from;
        senderCounts[cleanFrom] = (senderCounts[cleanFrom] || 0) + 1;
      });
    });

    const sortedSenders = Object.entries(senderCounts)
      .map(([sender, count]) => ({ sender, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...rep,
      topSenders: sortedSenders,
    };
  });

  return reports.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

/**
 * Helper to generate downloadable report files
 */
export function exportLogReportAsCSV(logs: LogEntry[], weekLabel?: string): void {
  const headers = ['Log ID', 'Timestamp', 'Week', 'Subject', 'From', 'Category', 'Email Date', 'Age (Days)'];
  const rows: string[] = [headers.join(',')];

  logs.forEach((log) => {
    if (log.removedMessages && log.removedMessages.length > 0) {
      log.removedMessages.forEach((msg) => {
        const escapeCSV = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
        rows.push([
          escapeCSV(log.id),
          escapeCSV(new Date(log.timestamp).toLocaleString()),
          escapeCSV(log.weekLabel),
          escapeCSV(msg.subject),
          escapeCSV(msg.from),
          escapeCSV(msg.categoryLabel || msg.category),
          escapeCSV(new Date(msg.date).toLocaleDateString()),
          msg.ageInDays,
        ].join(','));
      });
    } else {
      rows.push([
        log.id,
        new Date(log.timestamp).toLocaleString(),
        log.weekLabel,
        'No messages removed',
        '-',
        '-',
        '-',
        '0',
      ].join(','));
    }
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `gmail_cleaning_report_${weekLabel ? weekLabel.replace(/[^a-z0-9]/gi, '_') : 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportLogReportAsTXT(report: WeeklyReport): void {
  let content = `=======================================================\n`;
  content += `           GMAIL AUTO-CLEANER WEEKLY REPORT            \n`;
  content += `=======================================================\n`;
  content += `Period:         ${report.weekLabel}\n`;
  content += `Total Removed:  ${report.totalRemoved} emails\n`;
  content += `Runs Completed: ${report.runsCount}\n`;
  content += `Generated On:   ${new Date().toLocaleString()}\n`;
  content += `-------------------------------------------------------\n\n`;

  content += `CATEGORY BREAKDOWN:\n`;
  content += `  - Spam Folder:         ${report.categoryBreakdown.spam || 0} messages\n`;
  content += `  - Promotions:          ${report.categoryBreakdown.promotions || 0} messages\n`;
  content += `  - Socials:             ${report.categoryBreakdown.social || 0} messages\n`;
  content += `  - Updates:             ${report.categoryBreakdown.updates || 0} messages\n`;
  content += `  - Targeted Primary:    ${report.categoryBreakdown.primary_targeted || 0} messages\n\n`;

  if (report.topSenders.length > 0) {
    content += `TOP REMOVED SENDERS:\n`;
    report.topSenders.forEach((s, idx) => {
      content += `  ${idx + 1}. ${s.sender} (${s.count} emails)\n`;
    });
    content += `\n`;
  }

  content += `DETAILED REMOVED MESSAGES AUDIT LOG:\n`;
  content += `-------------------------------------------------------\n`;

  report.logs.forEach((log) => {
    content += `[Run ${log.id.slice(0, 8)}] ${new Date(log.timestamp).toLocaleString()} (${log.triggeredBy.toUpperCase()})\n`;
    if (log.removedMessages && log.removedMessages.length > 0) {
      log.removedMessages.forEach((msg, i) => {
        content += `  ${i + 1}. [${msg.categoryLabel}] ${msg.subject}\n`;
        content += `     From: ${msg.from} | Date: ${new Date(msg.date).toLocaleDateString()} (${msg.ageInDays} days old)\n`;
      });
    } else {
      content += `  (No matching emails found to delete during this run)\n`;
    }
    content += `\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `weekly_gmail_report_${report.weekKey}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
