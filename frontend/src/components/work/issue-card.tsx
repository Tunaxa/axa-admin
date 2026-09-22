'use client';

import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';

import { APP_LABELS, PRIORITY_LABELS, PRIORITY_STYLES } from './labels';
import type { Issue } from './types';

export function IssueCard({
  issue,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={(event) => {
        // Firefox refuses to start a drag unless some data is set.
        event.dataTransfer.setData('text/plain', issue.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-grabbed={isDragging}
      className={cn(
        'bg-card hover:border-ring cursor-grab rounded-md border p-3 shadow-xs transition-colors',
        isDragging && 'opacity-50',
      )}
    >
      <h3 className="text-sm leading-snug font-medium">{issue.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={cn('text-xs', PRIORITY_STYLES[issue.priority])}>
          {PRIORITY_LABELS[issue.priority]}
        </span>

        {issue.app ? (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {APP_LABELS[issue.app]}
          </Badge>
        ) : null}

        {issue.assigneeName ? (
          <span
            className="bg-muted text-muted-foreground ml-auto grid size-5 place-items-center rounded-full text-[10px] font-medium"
            title={issue.assigneeName}
          >
            {issue.assigneeName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="text-muted-foreground ml-auto text-[11px]">Unassigned</span>
        )}
      </div>
    </article>
  );
}
