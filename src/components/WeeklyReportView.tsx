import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  PieChart,
  Trash2,
  ChevronDown,
  Inbox,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { LogEntry, WeeklyReport } from '../types';
import { exportLogReportAsCSV, exportLogReportAsTXT } from '../lib/storage';

interface WeeklyReportViewProps {
  weeklyReports: WeeklyReport[];
  allLogs: LogEntry[];
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  weeklyReports,
  allLogs,
}) => {
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(
    weeklyReports[0]?.weekKey || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Active weekly report
  const currentReport =
    weeklyReports.find((r) => r.weekKey === selectedWeekKey) || weeklyReports[0];

  if (!currentReport || weeklyReports.length === 0) {
    return (
      <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-[#666] mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="font-serif italic text-xl text-white">No Weekly Cleaning Audit Logs Yet</h3>
        <p className="text-xs text-[#777] max-w-md mx-auto">
          Run your first scan and cleanup to generate weekly report logs tracking all removed messages.
        </p>
      </div>
    );
  }

  // Flatten messages for the current report
  const allRemovedMessagesInWeek = currentReport.logs.flatMap((log) => log.removedMessages || []);

  const filteredMessages = allRemovedMessagesInWeek.filter((msg) => {
    const matchesSearch =
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' ? true : msg.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-xl overflow-hidden text-[#e5e5e5]">
      {/* Header */}
      <div className="px-6 py-4 bg-[#111] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#181818] text-emerald-400 border border-[#262626] flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-white">
              Weekly Cleaning Audit Reports
            </h3>
            <p className="text-[11px] font-mono text-[#777] uppercase tracking-wider">
              Historical logs and weekly breakdown of all removed messages
            </p>
          </div>
        </div>

        {/* Week Selector Dropdown & Export Options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={selectedWeekKey}
              onChange={(e) => setSelectedWeekKey(e.target.value)}
              className="appearance-none bg-[#141414] hover:bg-[#1f1f1f] text-white font-mono text-xs py-2 pl-3 pr-8 rounded border border-[#262626] focus:outline-none focus:border-[#555] cursor-pointer"
            >
              {weeklyReports.map((r) => (
                <option key={r.weekKey} value={r.weekKey}>
                  {r.weekLabel} ({r.totalRemoved} removed)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#666] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={() => exportLogReportAsCSV(currentReport.logs, currentReport.weekLabel)}
            className="px-3 py-2 rounded bg-[#141414] hover:bg-[#1f1f1f] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer border border-[#262626]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => exportLogReportAsTXT(currentReport)}
            className="px-3 py-2 rounded bg-[#141414] hover:bg-[#1f1f1f] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer border border-[#262626]"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit TXT</span>
          </button>
        </div>
      </div>

      {/* Report Summary Cards Grid */}
      <div className="p-6 bg-[#090909] border-b border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Removed Card */}
        <div className="bg-[#111] p-4 rounded border border-[#262626]">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest">
            Weekly Cleaned Count
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-serif text-white">
              {currentReport.totalRemoved}
            </span>
            <span className="text-xs font-mono text-[#666]">
              Across {currentReport.runsCount} {currentReport.runsCount === 1 ? 'run' : 'runs'}
            </span>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-[#111] p-4 rounded border border-[#262626] col-span-1 md:col-span-2">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2">
            Weekly Removal Distribution
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono">
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-red-400 block">Spam</span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.spam || 0}
              </span>
            </div>
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-[#888] block">Trash</span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.trash || 0}
              </span>
            </div>
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                Promos
              </span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.promotions || 0}
              </span>
            </div>
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-blue-400 block">Socials</span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.social || 0}
              </span>
            </div>
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Updates</span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.updates || 0}
              </span>
            </div>
            <div className="bg-[#141414] p-2 rounded border border-[#262626]">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                Primary
              </span>
              <span className="text-base font-bold text-white">
                {currentReport.categoryBreakdown.primary_targeted || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Removed Emails Table Search & Filter Bar */}
      <div className="px-6 py-3 border-b border-[#262626] bg-[#0d0d0d] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#555]" />
          <input
            type="text"
            placeholder="Search subject or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#555]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#555] hidden sm:block" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs font-mono text-[#aaa] focus:outline-none focus:border-[#555] cursor-pointer"
          >
            <option value="all">All Removed Categories ({allRemovedMessagesInWeek.length})</option>
            <option value="primary_targeted">Primary</option>
            <option value="promotions">Promotions</option>
            <option value="social">Social</option>
            <option value="updates">Updates</option>
            <option value="spam">Spam</option>
            <option value="trash">Trash</option>
          </select>
        </div>
      </div>

      {/* Table List of Logged Messages */}
      <div className="divide-y divide-[#1a1a1a] max-h-[450px] overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="py-12 text-center text-[#555]">
            <Inbox className="w-10 h-10 text-[#333] mx-auto mb-2" />
            <p className="text-xs font-mono text-[#777]">
              No messages match the active search/category filter for this week.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={`${msg.id}-${index}`}
              className="p-4 hover:bg-[#111] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="font-bold text-white truncate">{msg.from}</span>
                  <span className="text-[#444]">•</span>
                  <span className="text-[#777]">
                    {new Date(msg.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-[#ccc] font-medium truncate">{msg.subject}</div>
                {msg.snippet && (
                  <p className="text-[#666] text-[11px] truncate">{msg.snippet}</p>
                )}
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-[10px] text-[#666] bg-[#141414] border border-[#262626] px-2 py-0.5 rounded font-mono">
                  {msg.ageInDays}d old
                </span>
                <span
                  className="px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-[#1a1a1a] text-emerald-800 border border-[#333]"
                >
                  PURGED
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
