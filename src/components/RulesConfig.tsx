import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  X,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertCircle,
  HelpCircle,
  FolderSync,
} from 'lucide-react';
import { CleanerRules } from '../types';

interface RulesConfigProps {
  rules: CleanerRules;
  onSaveRules: (updatedRules: CleanerRules) => void;
}

export const RulesConfig: React.FC<RulesConfigProps> = ({ rules, onSaveRules }) => {
  const [formData, setFormData] = useState<CleanerRules>(rules);
  const [newSender, setNewSender] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddSender = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newSender.trim();
    if (clean && !formData.targetPrimarySenders.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      const updated = {
        ...formData,
        targetPrimarySenders: [...formData.targetPrimarySenders, clean],
      };
      setFormData(updated);
      setNewSender('');
    }
  };

  const handleRemoveSender = (senderToRemove: string) => {
    const updated = {
      ...formData,
      targetPrimarySenders: formData.targetPrimarySenders.filter((s) => s !== senderToRemove),
    };
    setFormData(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRules(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-xl overflow-hidden text-[#e5e5e5]">
      {/* Card Header */}
      <div className="px-6 py-4 bg-[#111] border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#181818] text-amber-400 border border-[#262626] flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-white">
              Cleaner Rules & Targeted Senders Configuration
            </h3>
            <p className="text-[11px] font-mono text-[#777] uppercase tracking-wider">
              Age limits, folder rules, and specific Primary Inbox senders
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#1a1a1a] text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Rules Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Section 1: Age Limit Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Message Age Limit Threshold</span>
            </label>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#141414] text-amber-400 border border-[#333]">
              Older than {formData.olderThanDays} days
            </span>
          </div>
          <p className="text-xs text-[#777]">
            Only emails received prior to this age limit will be flagged for automatic cleanup.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { days: 0, label: '0 Days (All Ages)' },
              { days: 1, label: '1 Day' },
              { days: 3, label: '3 Days' },
              { days: 7, label: '7 Days' },
              { days: 14, label: '14 Days' },
              { days: 30, label: '30 Days' },
              { days: 60, label: '60 Days' },
            ].map(({ days, label }) => (
              <button
                type="button"
                key={days}
                onClick={() => setFormData({ ...formData, olderThanDays: days })}
                className={`py-2 px-2 rounded text-[11px] font-bold transition-all cursor-pointer font-mono text-center ${
                  formData.olderThanDays === days
                    ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                    : 'bg-[#141414] text-[#aaa] border border-[#262626] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-[#262626]" />

        {/* Section 2: Target Categories */}
        <div className="space-y-3">
          <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold flex items-center space-x-2">
            <FolderSync className="w-3.5 h-3.5 text-blue-400" />
            <span>Target Gmail Folders & Categories</span>
          </label>
          <p className="text-xs text-[#777]">
            Select which predefined system categories to clean when messages pass the age limit.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* General Inbox */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanInbox === true}
                onChange={(e) => setFormData({ ...formData, cleanInbox: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Main / Primary Inbox (Protected by Default)</span>
                <span className="text-[11px] text-[#777]">
                  Off by default to safeguard primary emails. Enable only if you explicitly want to clean primary inbox emails.
                </span>
              </div>
            </label>

            {/* Spam */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanSpam}
                onChange={(e) => setFormData({ ...formData, cleanSpam: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Spam Folder</span>
                <span className="text-[11px] text-[#777]">
                  Scans and cleans emails sitting in Spam folder (disabled by default)
                </span>
              </div>
            </label>

            {/* Trash */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanTrash}
                onChange={(e) => setFormData({ ...formData, cleanTrash: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Trash Folder</span>
                <span className="text-[11px] text-[#777]">
                  Scans and permanently deletes items in Trash folder (disabled by default)
                </span>
              </div>
            </label>

            {/* Promotions */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanPromotions}
                onChange={(e) => setFormData({ ...formData, cleanPromotions: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Promotions Category (Active Default)</span>
                <span className="text-[11px] text-[#777]">
                  Deletes deals, marketing offers, and store newsletters
                </span>
              </div>
            </label>

            {/* Social */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanSocial}
                onChange={(e) => setFormData({ ...formData, cleanSocial: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Socials Category (Active Default)</span>
                <span className="text-[11px] text-[#777]">
                  Deletes social network notifications and activity alerts
                </span>
              </div>
            </label>

            {/* Updates */}
            <label className="flex items-start space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#141414] hover:border-[#333] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formData.cleanUpdates}
                onChange={(e) => setFormData({ ...formData, cleanUpdates: e.target.checked })}
                className="mt-0.5 rounded border-[#333] bg-[#0d0d0d] text-amber-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-white block">Updates Category (Active Default)</span>
                <span className="text-[11px] text-[#777]">
                  Deletes automated system notifications, bills, and receipts
                </span>
              </div>
            </label>
          </div>

          {/* Custom Query Filter */}
          <div className="pt-2">
            <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold block mb-1">
              Custom Gmail Search Filter (Optional)
            </label>
            <input
              type="text"
              value={formData.customQuery || ''}
              onChange={(e) => setFormData({ ...formData, customQuery: e.target.value })}
              placeholder="e.g. in:inbox, is:unread, label:sent, has:attachment, or 'unsubscribe'"
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#555] font-mono"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[10px] font-mono text-[#666]">Presets:</span>
              {['in:inbox', 'is:unread', 'label:inbox', 'unsubscribe', 'no-reply'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setFormData({ ...formData, customQuery: preset })}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#262626] bg-[#121212] text-[#aaa] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
              {formData.customQuery && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, customQuery: '' })}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors cursor-pointer"
                >
                  Clear Custom Filter
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className="border-[#262626]" />

        {/* Section 3: Primary Inbox Filters & Targeted Senders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Primary Inbox Filters & Senders</span>
            </label>
            <span className="text-xs font-mono text-[#666]">
              {formData.targetPrimarySenders.length} Primary Senders configured
            </span>
          </div>
          <p className="text-xs text-[#777]">
            Emails from these specific companies or sender keywords (e.g. Amazon, MagicBricks, PolicyBazaar) landing in your Primary Inbox will be scanned for cleanup when older than {formData.olderThanDays} days.
          </p>

          {/* Add Sender Form Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newSender}
              onChange={(e) => setNewSender(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSender())}
              placeholder="e.g. Amazon, MagicBricks, Zomato, PolicyBazaar..."
              className="flex-1 px-3.5 py-2.5 bg-[#141414] border border-[#262626] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#555]"
            />
            <button
              type="button"
              onClick={() => handleAddSender()}
              className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-black rounded text-xs font-bold uppercase tracking-widest flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Quick Keyword Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono text-[#666] mr-1">Quick Add:</span>
            {['Amazon', 'MagicBricks', 'Zomato', 'PolicyBazaar', 'unsubscribe', 'newsletter', 'no-reply', 'Swiggy'].map((kw) => {
              const exists = formData.targetPrimarySenders.some((s) => s.toLowerCase() === kw.toLowerCase());
              return (
                <button
                  type="button"
                  key={kw}
                  disabled={exists}
                  onClick={() => {
                    if (!exists) {
                      setFormData({
                        ...formData,
                        targetPrimarySenders: [...formData.targetPrimarySenders, kw],
                      });
                    }
                  }}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    exists
                      ? 'bg-[#181818] text-[#555] border-[#222] cursor-not-allowed'
                      : 'bg-[#141414] text-amber-400 border-[#262626] hover:bg-[#222] hover:border-amber-500/50'
                  }`}
                >
                  +{kw}
                </button>
              );
            })}
          </div>

          {/* Sender Badges List */}
          <div className="flex flex-wrap gap-2 pt-1">
            {formData.targetPrimarySenders.map((sender) => (
              <span
                key={sender}
                className="inline-flex items-center px-2.5 py-1 rounded bg-[#1a1a1a] text-xs font-mono text-[#ccc] border border-[#333]"
              >
                <span>{sender}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSender(sender)}
                  className="ml-2 text-[#777] hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <hr className="border-[#262626]" />

        {/* Section 4: Action Mode & Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action mode */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold block">
              Deletion Safety Mode
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs text-[#aaa] cursor-pointer">
                <input
                  type="radio"
                  name="deleteMode"
                  value="trash"
                  checked={formData.deleteMode === 'trash'}
                  onChange={() => setFormData({ ...formData, deleteMode: 'trash' })}
                  className="text-amber-500 border-[#333] bg-[#0d0d0d]"
                />
                <span>Move to Trash (Recommended - 30 days recovery window)</span>
              </label>
            </div>
          </div>

          {/* Automated Schedule */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#888] font-bold block">
              Automated Cleaning Schedule
            </label>
            <label className="flex items-center space-x-2 text-xs text-[#aaa] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoScheduleEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, autoScheduleEnabled: e.target.checked })
                }
                className="rounded border-[#333] bg-[#0d0d0d] text-amber-500"
              />
              <span>Enable Weekly Automated Background Scans</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span>Save Rules & Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
