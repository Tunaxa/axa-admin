'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { fetchProjectActivity } from './issues-api';
import { STATUS_LABELS, assigneeNameFor } from './labels';
import type { ActivityEvent, Issue, IssueStatus, Project, TeamMember } from './types';

type LoadState = 'loading' | 'ready' | 'failed';

/**
 * Chronological activity feed for one project.
 *
 * Newest first, grouped by day so a long feed stays readable without a
 * timestamp on every line.
 */
export function ActivityFeed({
  projects,
  issues,
  members,
}: {
  projects: Project[];
  issues: Issue[];
  members: TeamMember[];
}) {
  const [projectId, setProjectId] = React.useState<string | null>(projects[0]?.id ?? null);

  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No projects yet. The activity feed is scoped to a project, so there is nothing to show until
        one exists.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <label htmlFor="activity-project" className="text-muted-foreground text-xs font-medium">
          Project
        </label>
        <Select value={projectId ?? undefined} onValueChange={setProjectId}>
          <SelectTrigger id="activity-project" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {projectId ? (
          // Keyed by project so switching remounts with a fresh loading state,
          // rather than setting state from inside an effect.
          <ProjectActivity
            key={projectId}
            projectId={projectId}
            issues={issues}
            members={members}
          />
        ) : null}
      </div>
    </div>
  );
}

function ProjectActivity({
  projectId,
  issues,
  members,
}: {
  projectId: string;
  issues: Issue[];
  members: TeamMember[];
}) {
  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchProjectActivity(projectId)
      .then((loaded) => {
        if (cancelled) return;
        setEvents(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load the activity feed');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (state === 'loading') {
    return <p className="text-muted-foreground text-sm">Loading activity…</p>;
  }

  if (state === 'failed') {
    return (
      <p role="alert" className="text-destructive text-sm">
        {error}
      </p>
    );
  }

  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity in this project yet.</p>;
  }

  return <FeedGroups events={events} issues={issues} members={members} />;
}

function FeedGroups({
  events,
  issues,
  members,
}: {
  events: ActivityEvent[];
  issues: Issue[];
  members: TeamMember[];
}) {
  // Events arrive newest first, so grouping in order keeps the days in order.
  const groups = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const day = new Date(event.createdAt).toDateString();
    const existing = groups.get(day);

    if (existing) {
      existing.push(event);
    } else {
      groups.set(day, [event]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([day, dayEvents]) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <h3
            id={`day-${day}`}
            className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase"
          >
            {formatDay(day)}
          </h3>

          <ol className="border-border flex flex-col gap-3 border-l pl-4">
            {dayEvents.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="text-muted-foreground mr-2 font-mono text-xs tabular-nums">
                  {formatTime(event.createdAt)}
                </span>
                <EventSentence event={event} issues={issues} members={members} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Renders one event as a sentence. Unknown types are shown, not hidden. */
function EventSentence({
  event,
  issues,
  members,
}: {
  event: ActivityEvent;
  issues: Issue[];
  members: TeamMember[];
}) {
  const actor = assigneeNameFor(event.actorId, members) ?? 'Someone';
  const issueTitle = issues.find((issue) => issue.id === event.issueId)?.title ?? 'an issue';
  const title = <span className="font-medium">{issueTitle}</span>;

  switch (event.type) {
    case 'issue_status_changed': {
      const from = statusLabel(event.payload.from);
      const to = statusLabel(event.payload.to);

      return (
        <span>
          {actor} moved {title} from {from} to {to}
        </span>
      );
    }

    case 'issue_assigned': {
      const to = typeof event.payload.to === 'string' ? event.payload.to : null;
      const name = assigneeNameFor(to, members);

      return (
        <span>
          {actor}{' '}
          {name ? (
            <>
              assigned {title} to {name}
            </>
          ) : (
            <>unassigned {title}</>
          )}
        </span>
      );
    }

    case 'issue_commented': {
      const body = typeof event.payload.body === 'string' ? event.payload.body : '';

      return (
        <span>
          {actor} commented on {title}
          <span className="text-muted-foreground mt-1 block border-l pl-2 whitespace-pre-wrap">
            {body}
          </span>
        </span>
      );
    }

    default:
      return (
        <span className="text-muted-foreground">
          {actor} changed {title}
        </span>
      );
  }
}

function statusLabel(value: unknown): string {
  return typeof value === 'string' && value in STATUS_LABELS
    ? STATUS_LABELS[value as IssueStatus]
    : String(value);
}

function formatDay(day: string): string {
  const date = new Date(day);
  const today = new Date().toDateString();

  if (day === today) {
    return 'Today';
  }

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
