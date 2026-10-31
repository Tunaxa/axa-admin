'use client';

import { Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, AUTH_TOKEN_KEY } from '@/lib/api';

import { FantasyHero } from './fantasy-hero';

interface LoginResponse {
  accessToken: string;
}

/**
 * Login screen: an animated picture on the left, the form on the right.
 *
 * Accounts are created by the CEO or a manager, so signing in takes an email
 * and a password and nothing else — the company is found from the account.
 */
export function LoginView() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim() || !password) return;

    setSubmitting(true);

    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      try {
        window.localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
      } catch {
        // storage blocked: the session cannot be kept.
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error(
        'Connexion impossible',
        err instanceof Error ? err.message : 'Vérifie ton email et ton mot de passe.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background relative flex min-h-svh">
      <aside className="relative hidden min-h-svh flex-1 overflow-hidden lg:block">
        <FantasyHero />
      </aside>

      <div className="relative flex min-h-svh flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg text-sm font-bold shadow-sm">
              A
            </span>
            <div>
              <h1 className="text-base leading-tight font-semibold">AXA Admin</h1>
              <p className="text-muted-foreground text-xs leading-tight">Operations hub</p>
            </div>
          </div>

          <div className="bg-card shadow-soft border-border/70 rounded-2xl border p-6 sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground mt-1 mb-5 text-sm">
              Use your work email to continue.
            </p>

            <form onSubmit={handleSubmit} className="grid gap-3.5">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@axa.com"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Password</span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </label>

              <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="text-muted-foreground mt-5 text-center text-xs">
              Trouble signing in? Contact your manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
