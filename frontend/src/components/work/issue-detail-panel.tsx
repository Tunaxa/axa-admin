'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import type { IssuePatch } from './issues-api';
import { APP_LABELS, PRIORITY_LABELS, STATUS_LABELS } from './labels';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, type Issue, type TeamMember } from './types';

/** `Select` cannot hold an empty string as a value, so unassigned needs a token. */
const UNASSIGNED = '__unassigned__';

export function IssueDetailPanel({
  issue,
  members,
  onClose,
  onPatch,
}: {
  issue: Issue | null;
  members: TeamMember[];
  onClose: () => void;
  onPatch: (issueId: string, patch: IssuePatch) => void;
}) {
  return (
    <Sheet open={issue !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {issue ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-base leading-snug">{issue.title}</SheetTitle>
              <SheetDescription className="sr-only">Issue details</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
              <section>
                <h3 className="text-muted-foreground mb-1 text-xs font-medium">Description</h3>
                {issue.description ? (
                  <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No description</p>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <Field label="Status" htmlFor="issue-status">
                  <Select
                    value={issue.status}
                    onValueChange={(value) =>
                      onPatch(issue.id, { status: value as Issue['status'] })
                    }
                  >
                    <SelectTrigger id="issue-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Assignee" htmlFor="issue-assignee">
                  <Select
                    value={issue.assigneeId ?? UNASSIGNED}
                    onValueChange={(value) =>
                      onPatch(issue.id, { assigneeId: value === UNASSIGNED ? null : value })
                    }
                  >
                    <SelectTrigger id="issue-assignee" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Priority" htmlFor="issue-priority">
                  <Select
                    value={issue.priority}
                    onValueChange={(value) =>
                      onPatch(issue.id, { priority: value as Issue['priority'] })
                    }
                  >
                    <SelectTrigger id="issue-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Application">
                  {issue.app ? (
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {APP_LABELS[issue.app]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </Field>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-center gap-2">
      <label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
