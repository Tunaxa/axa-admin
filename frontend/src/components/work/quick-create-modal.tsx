'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { CreateIssueInput } from './issues-api';

/**
 * Quick-create modal for a new issue.
 *
 * Title and description only — status, priority and assignee fall back to the
 * schema defaults and are refined in the detail panel. The point of a quick
 * create is to capture the thought without a form standing in the way.
 *
 * Mounted only while it is open, so each open starts from an empty form
 * without an effect resetting state after the fact.
 */
export function QuickCreateModal({
  canCreate,
  onClose,
  onCreate,
}: {
  /** False when the tenant has no workspace to create the issue in. */
  canCreate: boolean;
  onClose: () => void;
  onCreate: (input: Omit<CreateIssueInput, 'workspaceId'>) => Promise<unknown>;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const trimmedTitle = title.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!trimmedTitle || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate({
        title: trimmedTitle,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not create the issue');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>
              Give it a title now; status, priority and assignee can be set afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quick-create-title" className="text-xs font-medium">
                Title
              </label>
              <Input
                id="quick-create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Issue title"
                // The modal is opened by a shortcut, so focus has to land here.
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quick-create-description" className="text-xs font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="quick-create-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Anything worth remembering"
                rows={4}
              />
            </div>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            {!canCreate ? (
              <p role="alert" className="text-destructive text-sm">
                No workspace to create the issue in.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedTitle || !canCreate || submitting}>
              {submitting ? 'Creating…' : 'Create issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
