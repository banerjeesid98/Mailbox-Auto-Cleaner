import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { EmailMessage } from '../types';

interface ScanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedMessages: EmailMessage[];
  errors: string[];
  isDeleting: boolean;
  onConfirmDelete: (selectedMessageIds: string[]) => void;
  olderThanDays: number;
  deleteMode: 'trash' | 'permanent';
}

function parseSender(fromStr: string | undefined): { label: string; domain: string; fullEmail: string } {
  const safeFrom = (fromStr || '').trim();
  let email = '';
  let name = '';

  const angleMatch = safeFrom.match(/<([^>]+)>/);
  if (angleMatch) {
    email = angleMatch[1].trim().toLowerCase();
    name = safeFrom.replace(/<[^>]+>/, '').replace(/"/g, '').trim();
  } else if (safeFrom.includes('@')) {
    email = safeFrom.toLowerCase();
  } else {
    name = safeFrom.replace(/"/g, '').trim();
  }

  const domain = email.includes('@') ? email.split('@')[1] : '';

  let label = domain;
  if (name && name.length > 1 && !name.toLowerCase().includes('no-reply') && !name.toLowerCase().includes('noreply')) {
    label = name;
  } else if (domain) {
    label = domain;
  } else {
    label = safeFrom || 'Unknown';
  }

  return { label: label || 'Unknown', domain: domain || '', fullEmail: email };
}

export const ScanPreviewModal: React.FC<ScanPreviewModalProps> = ({
  isOpen,
  onClose,
  scannedMessages = [],
  errors = [],
  isDeleting,
  onConfirmDelete,
  olderThanDays,
  deleteMode,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [senderFilter, setSenderFilter] = useState<string>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const safeScannedMessages = Array.isArray(scannedMessages) ? scannedMessages : [];

  useEffect(() => {
    // Select all by default when scanned messages change
    setSelectedIds(new Set(safeScannedMessages.map((m) => m.id)));
    setShowConfirmDialog(false);
    setCurrentPage(1);
    setSenderFilter('all');
  }, [scannedMessages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, senderFilter]);

  // Fully dynamic sender chips extracted from actual incoming scanned messages
  const dynamicSenderChips = useMemo(() => {
    const chipMap = new Map<string, { id: string; label: string; count: number }>();

    const activeMessages =
      categoryFilter === 'all'
        ? safeScannedMessages
        : safeScannedMessages.filter((m) => m && m.category === categoryFilter);

    activeMessages.forEach((msg) => {
      if (!msg) return;
      const { label, domain, fullEmail } = parseSender(msg.from);

      // Clean sender key
      const displayLabel = domain || label || fullEmail || 'Sender';
      const key = displayLabel.toLowerCase();

      if (!key || key.length < 2) return;

      if (!chipMap.has(key)) {
        chipMap.set(key, { id: key, label: displayLabel, count: 0 });
      }
      chipMap.get(key)!.count += 1;
    });

    const allChips = Array.from(chipMap.values());
    // Filter out unknown/generic fallback chips if real senders exist
    const hasRealSenders = allChips.some(
      (c) =>
        !c.label.toLowerCase().includes('unknown') &&
        !c.label.toLowerCase().includes('mailbox item') &&
        !c.label.toLowerCase().includes('mail sender')
    );

    const filteredChips = hasRealSenders
      ? allChips.filter(
          (c) =>
            !c.label.toLowerCase().includes('unknown') &&
            !c.label.toLowerCase().includes('mailbox item') &&
            !c.label.toLowerCase().includes('mail sender')
        )
      : allChips;

    return filteredChips
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [safeScannedMessages, categoryFilter]);

  const isTrashViewOrOnlyTrashSelected = useMemo(() => {
    if (categoryFilter === 'trash') return true;
    const selectedMsgs = safeScannedMessages.filter((m) => selectedIds.has(m.id));
    return selectedMsgs.length > 0 && selectedMsgs.every((m) => m && m.category === 'trash');
  }, [categoryFilter, safeScannedMessages, selectedIds]);

  if (!isOpen) return null;

  const handleTabSelect = (tabId: string) => {
    setCategoryFilter(tabId);
    setSenderFilter('all');
    setCurrentPage(1);
    const targetMessages =
      tabId === 'all'
        ? safeScannedMessages
        : safeScannedMessages.filter((m) => m && m.category === tabId);
    setSelectedIds(new Set(targetMessages.map((m) => m.id)));
  };

  const handleSenderSelect = (sender: string) => {
    setSenderFilter(sender);
    setCurrentPage(1);
    const s = (sender || '').toLowerCase();
    const matches = safeScannedMessages.filter((msg) => {
      if (!msg) return false;
      const matchCat = categoryFilter === 'all' ? true : msg.category === categoryFilter;
      const fromStr = (msg.from || '').toLowerCase();
      const subjectStr = (msg.subject || '').toLowerCase();
      const snippetStr = (msg.snippet || '').toLowerCase();

      const matchSend =
        s === 'all'
          ? true
          : fromStr.includes(s) || subjectStr.includes(s) || snippetStr.includes(s);
      return matchCat && matchSend;
    });
    setSelectedIds(new Set(matches.map((m) => m.id)));
  };

  const categoryCounts = {
    all: safeScannedMessages.length,
    primary_targeted: safeScannedMessages.filter((m) => m && m.category === 'primary_targeted').length,
    promotions: safeScannedMessages.filter((m) => m && m.category === 'promotions').length,
    social: safeScannedMessages.filter((m) => m && m.category === 'social').length,
    updates: safeScannedMessages.filter((m) => m && m.category === 'updates').length,
    spam: safeScannedMessages.filter((m) => m && m.category === 'spam').length,
    trash: safeScannedMessages.filter((m) => m && m.category === 'trash').length,
  };

  const filteredMessages = safeScannedMessages.filter((msg) => {
    if (!msg) return false;
    const matchesCategory = categoryFilter === 'all' ? true : msg.category === categoryFilter;

    const fromStr = (msg.from || '').toLowerCase();
    const subjectStr = (msg.subject || '').toLowerCase();
    const snippetStr = (msg.snippet || '').toLowerCase();

    const s = (senderFilter || '').toLowerCase();
    const matchesSender =
      s === 'all'
        ? true
        : fromStr.includes(s) || subjectStr.includes(s) || snippetStr.includes(s);

    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      q === ''
        ? true
        : subjectStr.includes(q) || fromStr.includes(q) || snippetStr.includes(q);

    return matchesCategory && matchesSender && matchesSearch;
  });

  const selectedInFilter = filteredMessages.filter((m) => selectedIds.has(m.id)).length;
  const isAllFilteredSelected =
    filteredMessages.length > 0 && selectedInFilter === filteredMessages.length;

  const totalPages = Math.ceil(filteredMessages.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const displayedMessages = filteredMessages.slice(startIndex, startIndex + PAGE_SIZE);

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllFilteredSelected) {
      // Deselect all filtered messages
      filteredMessages.forEach((m) => next.delete(m.id));
    } else {
      // Select all filtered messages
      filteredMessages.forEach((m) => next.add(m.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleStartDelete = () => {
    if (selectedIds.size === 0) return;
    setShowConfirmDialog(true);
  };

  const handleExecuteDelete = () => {
    onConfirmDelete(Array.from(selectedIds));
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'spam':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'promotions':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'social':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'updates':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'primary_targeted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] rounded-xl shadow-2xl border border-[#262626] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#e5e5e5]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#111] text-white flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#181818] text-amber-400 border border-[#262626] flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-white">
                Cleanup Preview & Confirmation
              </h3>
              <p className="text-[11px] font-mono text-[#777] uppercase tracking-wider">
                Messages older than {olderThanDays} days matching rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded text-[#777] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Summary Bar */}
        <div className="px-6 py-3 bg-[#141414] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#aaa]">
              Total Scanned: <strong className="text-white font-bold">{scannedMessages.length}</strong>
            </span>
            <span className="text-[#444]">|</span>
            <span className="text-[#aaa]">
              In Current Filter: <strong className="text-amber-300 font-bold">{filteredMessages.length}</strong>
            </span>
            <span className="text-[#444]">|</span>
            <span className="text-[#aaa]">
              Selected in Filter: <strong className="text-emerald-400 font-bold">{selectedInFilter} / {filteredMessages.length}</strong>
            </span>
            <span className="text-[#444]">|</span>
            <span className="text-[#aaa]">
              Total Selected: <strong className="text-emerald-400 font-bold">{selectedIds.size}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1a1a1a] text-amber-400 border border-[#333]">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Mode: {isTrashViewOrOnlyTrashSelected ? 'Permanent Delete (Trash Clean)' : deleteMode === 'trash' ? 'Move to Trash' : 'Permanent Delete'}
            </span>
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="px-6 py-2 bg-[#111] border-b border-[#262626] flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Categories', count: categoryCounts.all },
            { id: 'primary_targeted', label: 'Primary', count: categoryCounts.primary_targeted },
            { id: 'promotions', label: 'Promotions', count: categoryCounts.promotions },
            { id: 'social', label: 'Social', count: categoryCounts.social },
            { id: 'updates', label: 'Updates', count: categoryCounts.updates },
            { id: 'spam', label: 'Spam', count: categoryCounts.spam },
            { id: 'trash', label: 'Trash', count: categoryCounts.trash },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 border ${
                categoryFilter === tab.id
                  ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 font-bold'
                  : 'bg-[#181818] border-[#262626] text-[#888] hover:text-white hover:bg-[#222]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  categoryFilter === tab.id
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'bg-[#222] text-[#666]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dynamic Sender Quick Filter Chips Bar */}
        <div className="px-6 py-2 bg-[#0a0a0a] border-b border-[#222] flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono text-[#666] uppercase tracking-wider shrink-0 flex items-center space-x-1">
            <Filter className="w-3 h-3 text-amber-400" />
            <span>Dynamic Senders:</span>
          </span>
          <button
            onClick={() => handleSenderSelect('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap border ${
              senderFilter === 'all'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#141414] text-[#888] border-[#262626] hover:text-white hover:bg-[#202020]'
            }`}
          >
            All Senders
          </button>
          {dynamicSenderChips.map((chip) => {
            const isSelected = senderFilter.toLowerCase() === chip.label.toLowerCase();
            return (
              <button
                key={chip.id}
                onClick={() => handleSenderSelect(chip.label)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 border ${
                  isSelected
                    ? 'bg-amber-400 text-black font-bold border-amber-400'
                    : 'bg-[#141414] text-amber-400/80 border-[#262626] hover:text-amber-300 hover:border-amber-500/40 hover:bg-[#1a1a1a]'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-black/20 text-black font-bold' : 'bg-[#222] text-amber-300/70'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error notices if any */}
        {errors.length > 0 && (
          <div className="px-6 py-2 bg-red-950/30 border-b border-red-900/50 text-xs font-mono text-red-400">
            <strong>Scan notices:</strong> {errors.join('; ')}
          </div>
        )}

        {/* Filters & Search & Mass Select */}
        <div className="px-6 py-3 border-b border-[#262626] bg-[#0d0d0d] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#555]" />
            <input
              type="text"
              placeholder="Search subject, sender, Amazon, MagicBricks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#555]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={toggleSelectAll}
              disabled={filteredMessages.length === 0}
              className="px-3 py-1.5 rounded border border-[#262626] bg-[#141414] hover:bg-[#1f1f1f] text-xs font-mono text-white flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAllFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deselect Filtered ({filteredMessages.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-[#555]" />
                  <span>Select Filtered ({filteredMessages.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message Table List */}
        <div className="flex-1 overflow-y-auto min-h-[250px] p-6 bg-[#080808]">
          {filteredMessages.length === 0 ? (
            <div className="h-full py-12 flex flex-col items-center justify-center text-center text-[#555]">
              <Inbox className="w-12 h-12 text-[#333] mb-3" />
              <p className="font-serif italic text-lg text-white">No matching emails found</p>
              <p className="text-xs font-mono text-[#777] max-w-sm mt-1">
                Your inbox is clean according to the current scan rules (older than {olderThanDays} days).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedMessages.map((msg, idx) => {
                if (!msg) return null;
                const msgKey = msg.id || `msg_${idx}`;
                const isSelected = msg.id ? selectedIds.has(msg.id) : false;
                return (
                  <div
                    key={msgKey}
                    onClick={() => msg.id && toggleSelectOne(msg.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-[#141414] border-amber-500/50 shadow-sm'
                        : 'bg-[#0d0d0d] border-[#262626] opacity-50 hover:opacity-100'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#444]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-white truncate">
                          {msg.from}
                        </span>
                        <span className="text-[11px] font-mono text-[#666] whitespace-nowrap">
                          {(() => {
                            const d = msg.date ? new Date(msg.date) : new Date();
                            return isNaN(d.getTime())
                              ? 'Recent'
                              : d.toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                          })()}{' '}
                          ({msg.ageInDays || 0}d old)
                        </span>
                      </div>

                      <div className="text-xs text-[#ccc] font-medium truncate mb-1">
                        {msg.subject}
                      </div>

                      {msg.snippet && (
                        <p className="text-[11px] text-[#666] truncate">{msg.snippet}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1a1a1a] text-[#aaa] border border-[#333]">
                        {msg.category === 'primary_targeted' ? 'PRIMARY' : msg.categoryLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredMessages.length > PAGE_SIZE && (
          <div className="px-6 py-2.5 bg-[#111] border-t border-[#262626] flex items-center justify-between text-xs font-mono text-[#aaa]">
            <span>
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredMessages.length)} of {filteredMessages.length}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[#262626] bg-[#181818] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              >
                &larr; Prev
              </button>
              <span className="text-[#666]">
                Page {safePage} of {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[#262626] bg-[#181818] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Overlay Modal */}
        {showConfirmDialog && (
          <div className="p-6 bg-[#141414] border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif italic text-base text-white">
                  Confirm Workspace Deletion Action
                </h4>
                <p className="text-xs text-[#aaa] mt-0.5">
                  {isTrashViewOrOnlyTrashSelected ? (
                    <>
                      Are you sure you want to <strong>permanently delete {selectedIds.size} messages</strong> from Gmail Trash? This cannot be undone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to {deleteMode === 'permanent' ? 'permanently delete' : 'move'}{' '}
                      <strong>{selectedIds.size} messages</strong>{' '}
                      {deleteMode === 'permanent' ? 'forever? This cannot be undone.' : 'to Gmail Trash? Trashed items remain recoverable in Gmail Trash for 30 days.'}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded border border-[#262626] text-[#aaa] bg-[#1a1a1a] hover:bg-[#222] text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded text-black bg-white hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-black" />
                    <span>
                      {isTrashViewOrOnlyTrashSelected
                        ? 'Confirm Permanent Delete'
                        : deleteMode === 'permanent'
                        ? 'Confirm Permanent Delete'
                        : 'Confirm Move to Trash'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showConfirmDialog && (
          <div className="px-6 py-4 bg-[#111] border-t border-[#262626] flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-[#262626] text-[#888] hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleStartDelete}
              disabled={selectedIds.size === 0 || isDeleting}
              className="px-6 py-3 rounded font-bold text-xs uppercase tracking-widest text-black bg-white hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isTrashViewOrOnlyTrashSelected
                  ? `Permanently Delete ${selectedIds.size} Trash ${selectedIds.size === 1 ? 'Message' : 'Messages'}`
                  : `${deleteMode === 'permanent' ? 'Permanently Delete' : 'Move'} ${selectedIds.size} ${
                      senderFilter !== 'all'
                        ? `"${senderFilter.toUpperCase()}"`
                        : categoryFilter === 'primary_targeted'
                        ? 'PRIMARY'
                        : categoryFilter !== 'all'
                        ? categoryFilter.toUpperCase()
                        : ''
                    } ${selectedIds.size === 1 ? 'Message' : 'Messages'} ${deleteMode === 'trash' ? 'to Trash' : ''}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
