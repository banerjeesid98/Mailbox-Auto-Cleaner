import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from './lib/firebase';
import {
  fetchGmailProfile,
  scanTargetedEmails,
  removeMessagesBatch,
} from './lib/gmail';
import {
  loadRules,
  saveRules,
  loadLogEntries,
  saveLogEntry,
  buildWeeklyReports,
  getISOWeekInfo,
  DEFAULT_RULES,
} from './lib/storage';
import { CleanerRules, EmailCategory, EmailMessage, LogEntry, WeeklyReport } from './types';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { ScanPreviewModal } from './components/ScanPreviewModal';
import { RulesConfig } from './components/RulesConfig';
import { WeeklyReportView } from './components/WeeklyReportView';
import { AutoCleanScheduler } from './components/AutoCleanScheduler';
import {
  LayoutDashboard,
  Sliders,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Inbox,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [gmailProfile, setGmailProfile] = useState<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
  } | null>(null);

  const [rules, setRules] = useState<CleanerRules>(loadRules());
  const [logs, setLogs] = useState<LogEntry[]>(loadLogEntries());
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'reports'>('dashboard');

  // Scan & Deletion state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedMessages, setScannedMessages] = useState<EmailMessage[]>([]);
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status message / toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setNeedsAuth(false);
        loadUserProfile(token);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setGmailProfile(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync weekly reports whenever logs change
  useEffect(() => {
    setWeeklyReports(buildWeeklyReports(logs));
  }, [logs]);

  const loadUserProfile = async (token: string) => {
    try {
      const profile = await fetchGmailProfile(token);
      setGmailProfile(profile);
    } catch (err: any) {
      if (err.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
      }
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setUser(res.user);
        setNeedsAuth(false);
        showToast('Gmail account authorized successfully!', 'success');
        await loadUserProfile(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Sign-in popup closed.', 'info');
      } else {
        showToast(err.message || 'Google authorization failed.', 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRefreshProfile = async () => {
    const token = getAccessToken();
    if (token) {
      showToast('Refreshing Gmail profile...', 'info');
      await loadUserProfile(token);
      showToast('Gmail profile synced!');
    } else {
      setNeedsAuth(true);
    }
  };

  const handleSaveRules = (updatedRules: CleanerRules) => {
    setRules(updatedRules);
    saveRules(updatedRules);
    showToast('Cleaner rules updated successfully!');
  };

  // Trigger Inbox Scan
  const handleStartScan = async () => {
    let token = getAccessToken();

    if (!token || needsAuth) {
      try {
        setIsLoggingIn(true);
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setUser(res.user);
          setNeedsAuth(false);
        }
      } catch (err) {
        showToast('Google Sign In failed. Please allow Gmail access.', 'error');
        setIsLoggingIn(false);
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    if (!token) {
      showToast('Authentication required to scan Gmail inbox.', 'error');
      setNeedsAuth(true);
      return;
    }

    setIsScanning(true);
    setScanErrors([]);
    try {
      const { messages, errors } = await scanTargetedEmails(token, rules);
      setScannedMessages(messages);
      setScanErrors(errors);
      setIsPreviewModalOpen(true);

      if (messages.length === 0) {
        showToast(
          rules.olderThanDays > 0
            ? `Scan complete: 0 emails older than ${rules.olderThanDays}d found. Try selecting "0 Days (All Ages)" or "1 Day" on the Dashboard.`
            : `Scan complete: 0 emails matched active rules. Try adding targeted keywords in Cleaner Rules.`,
          'info'
        );
      } else {
        showToast(`Scan complete! Found ${messages.length} cleanable emails.`, 'success');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      if (err.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
        showToast('Session expired. Please reconnect your Gmail account.', 'error');
      } else {
        showToast(`Scan failed: ${err.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Execute Deletion of Selected Messages & Log into Weekly Report
  const handleConfirmDelete = async (selectedMessageIds: string[]) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsDeleting(true);
    try {
      const selectedMsgs = scannedMessages.filter((m) => selectedMessageIds.includes(m.id));
      const trashCategoryIds = selectedMsgs.filter((m) => m.category === 'trash').map((m) => m.id);
      const otherCategoryIds = selectedMsgs.filter((m) => m.category !== 'trash').map((m) => m.id);

      let successCount = 0;
      let failedCount = 0;

      // 1. Items in Trash folder are PERMANENTLY deleted from Gmail
      if (trashCategoryIds.length > 0) {
        const resTrash = await removeMessagesBatch(token, trashCategoryIds, 'permanent');
        successCount += resTrash.successCount;
        failedCount += resTrash.failedCount;
      }

      // 2. Items from other categories are handled according to rules.deleteMode
      if (otherCategoryIds.length > 0) {
        const resOther = await removeMessagesBatch(token, otherCategoryIds, rules.deleteMode);
        successCount += resOther.successCount;
        failedCount += resOther.failedCount;
      }

      // Filter removed messages object list for audit log
      const removedList = selectedMsgs;

      // Calculate category breakdown
      const breakdown: Record<EmailCategory, number> = {
        spam: 0,
        trash: 0,
        promotions: 0,
        social: 0,
        updates: 0,
        primary_targeted: 0,
      };

      removedList.forEach((msg) => {
        if (breakdown[msg.category] !== undefined) {
          breakdown[msg.category]++;
        }
      });

      // Construct Log Entry (capping detailed audit sample to 100 items to prevent localStorage quota errors)
      const weekInfo = getISOWeekInfo(new Date());
      const newLogEntry: LogEntry = {
        id: `run_${Date.now()}`,
        timestamp: new Date().toISOString(),
        weekKey: weekInfo.weekKey,
        weekLabel: weekInfo.weekLabel,
        messagesRemovedCount: successCount,
        breakdown,
        removedMessages: removedList.slice(0, 100),
        status: failedCount === 0 ? 'success' : 'partial',
        triggeredBy: 'manual',
      };

      // Save Log
      const updatedLogs = saveLogEntry(newLogEntry);
      setLogs(updatedLogs);

      // Update rules last run date
      const updatedRules = { ...rules, lastAutoRunDate: new Date().toISOString() };
      setRules(updatedRules);
      saveRules(updatedRules);

      setIsPreviewModalOpen(false);

      if (trashCategoryIds.length > 0 && otherCategoryIds.length === 0) {
        showToast(
          `Successfully permanently deleted ${successCount} items from Trash! Logged to ${weekInfo.weekLabel}.`,
          'success'
        );
      } else if (trashCategoryIds.length > 0) {
        showToast(
          `Successfully cleaned ${successCount} emails (${trashCategoryIds.length} permanently deleted from Trash)! Logged to ${weekInfo.weekLabel}.`,
          'success'
        );
      } else {
        showToast(
          `Successfully moved ${successCount} emails to Trash! Logged to ${weekInfo.weekLabel}.`,
          'success'
        );
      }

      // Refresh Gmail profile statistics
      loadUserProfile(token);
    } catch (err: any) {
      console.error('Deletion error:', err);
      showToast(`Failed to clean messages: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute overall stats
  const totalCleanedAllTime = logs.reduce((acc, l) => acc + (l.messagesRemovedCount || 0), 0);
  
  const currentWeekInfo = getISOWeekInfo(new Date());
  const currentWeekReport = weeklyReports.find((r) => r.weekKey === currentWeekInfo.weekKey);
  const totalCleanedThisWeek = currentWeekReport?.totalRemoved || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans antialiased flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-3 rounded-lg shadow-2xl border text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#141414] text-emerald-400 border-emerald-500/30'
                : toastMessage.type === 'error'
                ? 'bg-[#141414] text-red-400 border-red-500/30'
                : 'bg-[#141414] text-amber-400 border-amber-500/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <Header
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onRefresh={handleRefreshProfile}
        onSignIn={handleSignIn}
        gmailProfile={gmailProfile}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Connection Notice if Not Authenticated */}
        {needsAuth && (
          <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif italic text-lg text-white">Gmail Authentication Required</h3>
                <p className="text-xs text-[#888] mt-1">
                  Connect your Google account with permission to scan and clean Spam, Promotions, Social, Updates, and targeted sender emails older than 14 days.
                </p>
                <p className="text-[11px] font-mono text-[#666] mt-1">
                  If running inside the preview iframe, you can also click <span className="text-amber-400">Open in New Tab</span> (top right or below) to bypass third-party cookie/iframe restrictions.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded bg-[#181818] hover:bg-[#262626] text-white font-mono text-xs border border-[#262626] transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in New Tab</span>
              </a>
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="px-5 py-2.5 rounded bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-sm"
              >
                {isLoggingIn ? 'Connecting...' : 'Authorize Gmail Access'}
              </button>
            </div>
          </div>
        )}

        {/* Overview Banner & Stat Cards */}
        <DashboardOverview
          rules={rules}
          weeklyReports={weeklyReports}
          totalCleanedAllTime={totalCleanedAllTime}
          totalCleanedThisWeek={totalCleanedThisWeek}
          isScanning={isScanning}
          onTriggerScan={handleStartScan}
          onUpdateRules={handleSaveRules}
          needsAuth={needsAuth}
        />

        {/* Navigation Tabs */}
        <div className="border-b border-[#262626] flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-8 pb-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 text-xs uppercase tracking-[0.2em] font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-[#888] hover:text-white border-b-2 border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-2 text-xs uppercase tracking-[0.2em] font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                activeTab === 'rules'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-[#888] hover:text-white border-b-2 border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Rules ({rules.targetPrimarySenders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`pb-2 text-xs uppercase tracking-[0.2em] font-medium transition-colors flex items-center space-x-2 cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-[#888] hover:text-white border-b-2 border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Logs ({weeklyReports.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content 1: Dashboard & Scheduler */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <AutoCleanScheduler
              rules={rules}
              onToggleScheduler={(enabled) => handleSaveRules({ ...rules, autoScheduleEnabled: enabled })}
              onRunScheduledCheckNow={handleStartScan}
              isScanning={isScanning}
              lastAutoRunDate={rules.lastAutoRunDate}
            />

            <WeeklyReportView weeklyReports={weeklyReports} allLogs={logs} />
          </div>
        )}

        {/* Tab Content 2: Rules & Senders Config */}
        {activeTab === 'rules' && (
          <RulesConfig rules={rules} onSaveRules={handleSaveRules} />
        )}

        {/* Tab Content 3: Weekly Reports */}
        {activeTab === 'reports' && (
          <WeeklyReportView weeklyReports={weeklyReports} allLogs={logs} />
        )}
      </main>

      {/* Confirmation & Scan Preview Modal */}
      <ScanPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        scannedMessages={scannedMessages}
        errors={scanErrors}
        isDeleting={isDeleting}
        onConfirmDelete={handleConfirmDelete}
        olderThanDays={rules.olderThanDays}
        deleteMode={rules.deleteMode}
      />

      {/* Minimal Footer */}
      <footer className="mt-auto py-6 border-t border-[#262626] bg-[#0d0d0d] text-[#666] text-xs font-mono text-center">
        <p className="max-w-7xl mx-auto px-4">
          CleanSlate • Gmail API Auto-Cleaner with 14-Day Purge Rules & Weekly Audit Reports
        </p>
      </footer>
    </div>
  );
}
