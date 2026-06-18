/**
 * Minimal reactive store for PawPal.
 */

export type State = {
  ui: {
    activeTab: string;
    theme: 'light' | 'dark';
    online: boolean;
    [key: string]: any;
  };
};

function loadTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('dc_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const initialState: State = {
  ui: {
    activeTab: 'tabHome',
    theme: loadTheme(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  },
};

let state = { ...initialState };

type Listener = (state: State) => void;

const listeners = new Set<Listener>();

export function getState(): State {
  return state;
}

export function setState(partial: Partial<State>) {
  state = { ...state, ...partial };
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initializeStore() {
  // Optional: hydrate persisted state
  console.log('[Store] Initialized');
}