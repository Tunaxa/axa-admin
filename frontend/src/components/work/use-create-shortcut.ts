'use client';

import * as React from 'react';

/** Elements where a bare letter key means "type a c", not "open quick create". */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Opens quick create on `c`.
 *
 * Deliberately narrow: it ignores the key while the caret is in a field, while
 * a modifier is held (so `Ctrl+C` still copies), and while any dialog is open —
 * including the command palette, whose search box would otherwise swallow or
 * fight for the key.
 */
export function useCreateShortcut(onTrigger: () => void): void {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'c' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.defaultPrevented || isTypingTarget(event.target)) {
        return;
      }

      // Radix marks open dialogs and sheets with this attribute.
      if (document.querySelector('[role="dialog"][data-state="open"]')) {
        return;
      }

      event.preventDefault();
      onTrigger();
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onTrigger]);
}
