import React from 'react';
import { Clock, Play, Pause, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import { CleanerRules } from '../types';

interface AutoCleanSchedulerProps {
  rules: CleanerRules;
  onToggleScheduler: (enabled: boolean) => void;
  onRunScheduledCheckNow: () => void;
  isScanning: boolean;
  lastAutoRunDate?: string;
}

export const AutoCleanScheduler: React.FC<AutoCleanSchedulerProps> = ({
  rules,
  onToggleScheduler,
  onRunScheduledCheckNow,
  isScanning,
  lastAutoRunDate,
}) => {
  return (
    <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-6 text-[#e5e5e5] shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest ${
                rules.autoScheduleEnabled
                  ? 'bg-[#1a1a1a] text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#141414] text-[#777] border border-[#262626]'
              }`}
            >
              <Clock className="w-3 h-3 mr-1.5" />
              {rules.autoScheduleEnabled ? 'Weekly Scheduler Active' : 'Scheduler Disabled'}
            </span>

            {lastAutoRunDate && (
              <span className="text-[11px] font-mono text-[#666]">
                Last Auto-Run: {new Date(lastAutoRunDate).toLocaleDateString()}
              </span>
            )}
          </div>

          <h3 className="font-serif italic text-xl text-white">
            Automated Background Weekly Sanitizer
          </h3>
          <p className="text-xs text-[#777] max-w-xl">
            When enabled, the app automatically checks your Gmail weekly and purges Promotions, Updates, and Socials older than {rules.olderThanDays} days matching your rules. Primary Inbox is protected by default.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onToggleScheduler(!rules.autoScheduleEnabled)}
            className={`px-4 py-2.5 rounded text-xs font-bold uppercase tracking-widest border flex items-center space-x-2 transition-all cursor-pointer ${
              rules.autoScheduleEnabled
                ? 'bg-[#141414] hover:bg-[#1f1f1f] text-white border-[#262626]'
                : 'bg-white hover:bg-neutral-200 text-black border-white'
            }`}
          >
            {rules.autoScheduleEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Schedule</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-black" />
                <span>Enable Schedule</span>
              </>
            )}
          </button>

          <button
            onClick={onRunScheduledCheckNow}
            disabled={isScanning}
            className="px-4 py-2.5 rounded bg-[#141414] hover:bg-[#1f1f1f] text-amber-400 border border-[#333] text-xs font-bold uppercase tracking-widest flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Check Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
