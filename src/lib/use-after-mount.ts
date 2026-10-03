import { useMemo, useSyncExternalStore } from "react";

// Nothing to subscribe to: the value is read once, like the former mount effect.
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Returns `serverValue` during server rendering and hydration, and `load()`
 * once the component runs in the browser (e.g. values from sessionStorage).
 *
 * Replaces `useEffect(() => setValue(load()), [])` without calling setState
 * synchronously inside an effect. The first client render after hydration
 * shows the loaded value, so markup still matches the server HTML.
 * `load` and `serverValue` must be stable (module-level) references.
 */
export function useAfterMount<T>(load: () => T, serverValue: T): T {
  const mounted = useSyncExternalStore(subscribeNever, onClient, onServer);
  return useMemo(
    () => (mounted ? load() : serverValue),
    [mounted, load, serverValue],
  );
}
