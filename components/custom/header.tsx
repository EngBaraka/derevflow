'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  /** When provided, a Sign up button is rendered to the right of the Log in button. */
  onSignUp?: () => Promise<void>;
  /** Logo source URL or data URL. When omitted, a placeholder badge is shown until
   *  the user provides a logo via the app builder (passed as a data URL via PREVIEW_BRANDING). */
  logoSrc?: string;
  /** App name used to derive the fallback logo letter when no logoSrc is provided.
   *  Falls back to NEXT_PUBLIC_DERIV_APP_NAME env var, then 'Deriv Trading'. */
  appName?: string;
  /** Optional controls rendered to the left of the login/logout button (e.g. a theme toggle). */
  actions?: React.ReactNode;
}

function formatBalance(balance: string): string {
  return Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AccountLabel({ type }: { type: 'demo' | 'real' }) {
  return (
    <span
      className={cn(
        'text-sm font-medium',
        type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
      )}
    >
      {type === 'demo' ? 'Demo account' : 'Real account'}
    </span>
  );
}

export function Header({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onLogout,
  onSwitchAccount,
  onSignUp,
  logoSrc,
  appName,
  actions,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const logoLetter = (appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading')
    .trim()
    .charAt(0)
    .toUpperCase() || 'D';
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const isAuthenticated = authState === 'authenticated';
  const isAuthenticating = authState === 'authenticating';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {!logoSrc || logoError ? (
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {logoLetter}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- next/image is avoided here intentionally: it errors in the optimizer when /logo.png is absent locally; a plain img with onError gives the same silent fallback behaviour
          <img
            src={logoSrc}
            alt="App Logo"
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        )}
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          {process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading'}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {isAuthenticated && activeAccount && (
          <Popover open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border px-3 hover:bg-muted/50 transition-colors">
                <div className="text-left">
                  <AccountLabel type={activeAccount.account_type} />
                  <p className="text-base font-bold text-foreground">
                    {formatBalance(activeAccount.balance)} {activeAccount.currency}
                  </p>
                </div>
                <svg
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    accountSwitcherOpen && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="space-y-1">
                {accounts.map((account) => (
                  <button
                    key={account.account_id}
                    onClick={() => {
                      onSwitchAccount(account.account_id);
                      setAccountSwitcherOpen(false);
                    }}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2.5 transition-colors',
                      account.account_id === activeAccount.account_id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <AccountLabel type={account.account_type} />
                    <p className="text-base font-bold text-foreground">
                      {formatBalance(account.balance)} {account.currency}
                    </p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {isAuthenticated ? (
          <Button variant="destructive" onClick={onLogout}>
            Logout
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogin} disabled={isAuthenticating}>
              {isAuthenticating ? 'Logging in...' : 'Log in'}
            </Button>
            {onSignUp && (
              <Button size="sm" onClick={onSignUp} disabled={isAuthenticating}>
                Sign up
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
