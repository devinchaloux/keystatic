// FORK (devinchaloux): focus mode — just the prose.
//
// One switch that collapses both side panels while writing: the app's
// navigation and an entry's fields panel. Toggled by the ⤢ button in an
// entry's header or ⌘⇧F / Ctrl+Shift+F, and remembered across reloads, since
// a writing session tends to outlast a page load.
//
// A tiny shared store rather than React context: the two panels and the
// button live in different subtrees, and this is one boolean.

import { useEffect, useSyncExternalStore } from 'react';
import { isHotkey } from 'is-hotkey';

const KEY = 'keystatic-fork:focus';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let focused = typeof window === 'undefined' ? false : read();

export function setFocusMode(next: boolean) {
  focused = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // Storage blocked: focus still applies, it just isn't remembered.
  }
  listeners.forEach(listener => listener());
}

export function toggleFocusMode() {
  setFocusMode(!focused);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether focus mode is on; re-renders when it changes. */
export function useFocusMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => focused,
    () => false
  );
}

const isFocusHotkey = isHotkey('mod+shift+f');

/** The keyboard shortcut. Mount once (the app shell does). */
export function useFocusModeShortcut() {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (isFocusHotkey(event)) {
        event.preventDefault();
        toggleFocusMode();
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
}
