'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';

/**
 * Shows a freshly created account's login once, with a copy button.
 *
 * The password is only ever known in this browser at the moment of creation —
 * the server keeps a hash — so this is the one chance to hand it over.
 */
export function CredentialsCard({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Email : ${email}\nMot de passe : ${password}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the values are on screen to be copied by hand.
    }
  }

  return (
    <div className="bg-muted/50 border-border/70 flex flex-col gap-2 rounded-lg border p-3 font-mono text-xs">
      <div className="flex gap-2">
        <span className="text-muted-foreground w-24 shrink-0">Email</span>
        <span className="text-foreground break-all select-all">{email}</span>
      </div>
      <div className="flex gap-2">
        <span className="text-muted-foreground w-24 shrink-0">Mot de passe</span>
        <span className="text-foreground break-all select-all">{password}</span>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-1 w-fit" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copié' : 'Copier les identifiants'}
      </Button>
    </div>
  );
}
