'use client';

import { ArrowRight, Loader2, LogIn, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, AUTH_TOKEN_KEY } from '@/lib/api';

interface LoginResponse {
  accessToken: string;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
}

/**
 * Login screen.
 *
 * Split layout: polished brand panel on the left (gradient, floating orbs,
 * value prop), form card on the right. The organization slug resolves to an
 * id with a quick public lookup, so the user never has to deal with a UUID.
 */
export function LoginView() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [orgSlug, setOrgSlug] = React.useState('axa');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      const org = await apiFetch<Organization>(
        `/auth/organizations/by-slug?slug=${encodeURIComponent(orgSlug.trim() || 'axa')}`,
      );
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ organizationId: org.id, email: email.trim(), password }),
      });
      try {
        window.localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
      } catch {
        // storage blocked — the push below still works for the session.
      }
      toast.success('Welcome back', `Signed in as ${email.trim()}`);
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error('Sign in failed', err instanceof Error ? err.message : 'Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background relative flex min-h-svh">
      {/* Background orbs — purely decorative. */}
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-32 -left-24 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full blur-3xl"
      />

      {/* Brand panel — hidden on narrow screens. */}
      <aside className="relative hidden min-h-svh flex-1 flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          aria-hidden
          className="from-primary/15 to-primary/5 absolute inset-0 bg-gradient-to-br via-transparent"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground relative grid size-10 place-items-center rounded-xl text-sm font-bold shadow-lg">
            A
            <span
              aria-hidden
              className="bg-primary/40 absolute inset-0 -z-10 scale-125 rounded-xl blur-lg"
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">AXA Admin</span>
            <span className="text-muted-foreground text-xs">Operations hub</span>
          </div>
        </div>

        <div className="relative flex max-w-md flex-col gap-6">
          <span className="bg-primary/10 text-primary border-primary/20 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3" aria-hidden />
            One hub for every AXA team
          </span>
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">
            Run the whole company from a single, keyboard-first workspace.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Work, roadmap, calendar, docs, org chart, team and billing — all tied together, all
            scoped to your tenant, all built to be fast.
          </p>
          <ul className="text-foreground/85 flex flex-col gap-2 text-sm">
            {[
              'Multi-tenant from day one',
              'Role × app permissions',
              'Dark mode, ⌘K palette, Notion-style editor',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="bg-primary/15 text-primary grid size-5 place-items-center rounded-full">
                  <ArrowRight className="size-3" aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground relative text-[11px]">
          © {new Date().getFullYear()} AXA ecosystem · Internal tooling
        </p>
      </aside>

      {/* Form panel. */}
      <div className="relative flex min-h-svh flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg text-sm font-bold shadow-sm">
              A
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">AXA Admin</h1>
              <p className="text-muted-foreground text-xs leading-tight">
                Internal operations platform
              </p>
            </div>
          </div>

          <div className="bg-card shadow-soft rounded-2xl border border-border/70 p-6 sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground mb-5 mt-1 text-sm">
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

              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Organization</span>
                <Input
                  type="text"
                  autoComplete="organization"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="axa"
                />
                <span className="text-muted-foreground text-[11px]">
                  The tenant slug your admin shared with you.
                </span>
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
              Trouble signing in? Contact your admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
