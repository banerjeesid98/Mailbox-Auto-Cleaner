import React from 'react';
import { Mail, LogOut, RefreshCw, ShieldCheck, Trash2, CheckCircle2, ExternalLink } from 'lucide-react';
import { googleSignIn, logout } from '../lib/firebase';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onRefresh: () => void;
  onSignIn: () => void;
  gmailProfile?: { emailAddress: string; messagesTotal: number; threadsTotal: number } | null;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onRefresh,
  onSignIn,
  gmailProfile,
}) => {
  return (
    <header className="bg-[#0d0d0d] border-b border-[#262626] text-[#e5e5e5] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 bg-white rounded-sm flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-black rotate-45"></div>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-serif italic text-2xl tracking-tight text-white">
                CleanSlate<span className="text-amber-500 font-sans not-italic text-lg">.</span>
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-[#1a1a1a] text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1.5"></span>
                14-Day Purge
              </span>
            </div>
            <p className="text-[11px] text-[#777] font-mono uppercase tracking-wider hidden sm:block">
              Spam, Promotions, Social, Updates & Targeted Senders Cleaner
            </p>
          </div>
        </div>

        {/* Right Section / Auth Status */}
        <div className="flex items-center space-x-3">
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            title="Open application in a new browser tab for full OAuth & Gmail API support"
            className="hidden md:inline-flex items-center space-x-1.5 px-3 py-2 rounded bg-[#181818] hover:bg-[#262626] text-[#aaa] hover:text-white border border-[#262626] text-xs font-mono transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </a>

          {needsAuth || !user ? (
            <button
              onClick={onSignIn}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="mr-2">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
              </div>
              <span>{isLoggingIn ? 'Connecting...' : 'Connect Gmail Account'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={onRefresh}
                title="Refresh Gmail connection and sync state"
                className="p-2 rounded bg-[#181818] hover:bg-[#262626] text-[#888] hover:text-white border border-[#262626] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2.5 bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-[#333]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#262626] flex items-center justify-center text-[10px] font-bold text-white font-mono">
                    {user.email?.[0].toUpperCase() || 'G'}
                  </div>
                )}
                <div className="text-xs">
                  <div className="font-medium text-white truncate max-w-[140px] sm:max-w-[200px]">
                    {gmailProfile?.emailAddress || user.email}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    Connected
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign out of Gmail"
                className="p-2 rounded bg-[#181818] hover:bg-red-950/30 text-[#888] hover:text-red-400 border border-[#262626] hover:border-red-900/50 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
