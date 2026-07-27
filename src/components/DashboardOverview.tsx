import React from 'react';
import { Trash2, ShieldAlert, Calendar, Mail, Zap, Clock, FileCheck } from 'lucide-react';
import { CleanerRules, WeeklyReport } from '../types';

interface DashboardOverviewProps {
  rules: CleanerRules;
  weeklyReports: WeeklyReport[];
  totalCleanedAllTime: number;
  totalCleanedThisWeek: number;
  isScanning: boolean;
  onTriggerScan: () => void;
  onUpdateRules?: (updatedRules: CleanerRules) => void;
  needsAuth: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  rules,
  weeklyReports,
  totalCleanedAllTime,
  totalCleanedThisWeek,
  isScanning,
  onTriggerScan,
  onUpdateRules,
  needsAuth,
}) => {
  const activeFoldersCount = [
    rules.cleanSpam,
    rules.cleanTrash,
    rules.cleanPromotions,
    rules.cleanSocial,
    rules.cleanUpdates,
  ].filter(Boolean).length;

  const targetedSendersCount = rules.targetPrimarySenders.filter((s) => s.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* Primary Banner Card */}
      <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-6 sm:p-8 shadow-xl text-[#e5e5e5] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#1a1a1a] text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Age Limit: {rules.olderThanDays === 0 ? '0 Days (All Ages)' : `${rules.olderThanDays} Days`}
              </div>

              {onUpdateRules && (
                <div className="inline-flex items-center space-x-1 text-xs font-mono">
                  <span className="text-[#777] uppercase text-[10px] mr-1">Quick Change:</span>
                  {[0, 1, 3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => onUpdateRules({ ...rules, olderThanDays: days })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        rules.olderThanDays === days
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-[#181818] text-[#aaa] border-[#333] hover:bg-[#222] hover:text-white'
                      }`}
                    >
                      {days === 0 ? 'All' : `${days}d`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
              Automated Inbox Sanitizer & Weekly Auditor
            </h2>
            <p className="text-[#aaa] text-sm leading-relaxed">
              Sweeping Promotions, Socials, and Updates emails{' '}
              {rules.olderThanDays === 0
                ? 'of all ages'
                : `older than ${rules.olderThanDays} days`}{' '}
              (Primary Inbox protected by default).
            </p>

            {/* Quick Custom Query Filter bar */}
            {onUpdateRules && (
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={rules.customQuery || ''}
                  onChange={(e) => onUpdateRules({ ...rules, customQuery: e.target.value })}
                  placeholder="Custom search query (e.g. in:inbox, is:unread, label:sent...)"
                  className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-amber-300 font-mono placeholder-[#555] focus:outline-none focus:border-amber-500/50 flex-1"
                />
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-[10px] text-[#666] font-mono uppercase">Quick Filter:</span>
                  {['in:inbox', 'is:unread', 'unsubscribe'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => onUpdateRules({ ...rules, customQuery: preset })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                        rules.customQuery === preset
                          ? 'bg-amber-400 text-black border-amber-400 font-bold'
                          : 'bg-[#181818] text-[#aaa] border-[#333] hover:text-white hover:bg-[#222]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {rules.customQuery && (
                    <button
                      onClick={() => onUpdateRules({ ...rules, customQuery: '' })}
                      className="px-2 py-1 rounded text-[10px] font-mono bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="px-8 py-3.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className={`w-4 h-4 ${isScanning ? 'animate-bounce' : ''}`} />
              <span>{isScanning ? 'Scanning Inbox...' : 'Manual Sweep & Preview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0d0d0d] border-l-2 border-l-amber-500 border border-[#262626] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold">
              Cleaned This Week
            </span>
            <div className="w-8 h-8 rounded bg-[#181818] text-amber-400 border border-[#262626] flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-serif text-white">
              {totalCleanedThisWeek.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-[#666]">messages</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0d0d0d] border-l-2 border-l-emerald-500 border border-[#262626] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold">
              Total Logged Purges
            </span>
            <div className="w-8 h-8 rounded bg-[#181818] text-emerald-400 border border-[#262626] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-serif text-white">
              {totalCleanedAllTime.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-[#666]">all-time</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0d0d0d] border-l-2 border-l-blue-500 border border-[#262626] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold">
              Active Target Folders
            </span>
            <div className="w-8 h-8 rounded bg-[#181818] text-blue-400 border border-[#262626] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-serif text-white">
              {activeFoldersCount}{' '}
              <span className="text-base font-sans text-[#666] font-normal">/ 5</span>
            </span>
            <span className="text-[11px] font-mono text-[#666]">+{targetedSendersCount} senders</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0d0d0d] border-l-2 border-l-purple-500 border border-[#262626] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold">
              Weekly Audit Logs
            </span>
            <div className="w-8 h-8 rounded bg-[#181818] text-purple-400 border border-[#262626] flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-serif text-white">
              {weeklyReports.length}
            </span>
            <span className="text-[11px] font-mono text-[#666]">reports</span>
          </div>
        </div>
      </div>
    </div>
  );
};
