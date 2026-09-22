'use client';

import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';

import { APP_LABELS, PRIORITY_LABELS, PRIORITY_STYLES } from './labels';
import type { Issue } from './types';

export function IssueCard({
  issue,
  assigneeName,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  issue: Issue;
  assigneeName: string | null;
  isDragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      draggable
      role="button"
      tabIndex={0}
      onClick={onOpen}
      // Dragging is mouse-only, so the keyboard needs its own way in.
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      onDragStart={(event) => {
        // Firefox refuses to start a drag unless some data is set.
        event.dataTransfer.setData('text/plain', issue.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-grabbed={isDragging}
      className={cn(
        'bg-card hover:border-ring cursor-grab rounded-md border p-3 text-left shadow-xs transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
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

        {assigneeName ? (
          <span
            className="bg-muted text-muted-foreground ml-auto grid size-5 place-items-center rounded-full text-[10px] font-medium"
            title={assigneeName}
          >
            {assigneeName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="text-muted-foreground ml-auto text-[11px]">Unassigned</span>
        )}
      </div>
    </article>
  );
}
