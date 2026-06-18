import { useState, useEffect } from 'react';
import { getState, subscribe, State } from '../state/store';

export function useStore<T>(selector: (state: State) => T): T {
  const [value, setValue] = useState<T>(() => selector(getState()));

  useEffect(() => {
    const unsub = subscribe((s) => {
      setValue(selector(s));
    });
    return () => {
      unsub();
    };
  }, [selector]);

  return value;
}