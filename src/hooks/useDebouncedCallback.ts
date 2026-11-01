import { useEffect, useMemo, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delayMs);
      }) as T,
    [delayMs],
  );
}
