import { useEffect, useRef } from "react";

// Which ids are arriving for the first time in THIS render.
//
// An animation on "a new item appeared" needs to know which item is new, and
// React does not tell you — a re-render looks identical whether the list grew
// or merely refetched the same rows.
//
// WHY THE BOOKKEEPING HAPPENS IN AN EFFECT, NOT DURING RENDER.
// The obvious version marks ids as seen while computing the answer. It works
// in production and silently breaks in development: StrictMode renders every
// component twice, so the first pass would record the new id and the second
// pass — the one React keeps — would find it already known and report nothing
// entering. The animation would never play in `npm run dev` while working in
// the build, which is close to the worst way for a bug to behave.
//
// Reading the ref during render and writing it afterwards makes both passes
// compute the same answer. The class still lands in the same commit as the
// element, so there is no frame where the item is painted un-animated.
//
// react-hooks/refs is switched off for this file in eslint.config.js, with the
// reasoning recorded there. An inline directive does not work: the rule follows
// the value through the local alias, so it would have to be repeated at every
// use site.
//
// The FIRST render reports nothing entering. Otherwise opening a screen would
// animate the whole existing history as if it had just arrived, which says
// something false about what changed.
export function useEnteredItems(ids: readonly string[]): Set<string> {
  const seen = useRef<Set<string> | null>(null);

  const seenIds = seen.current;

  const entering = new Set<string>();
  if (seenIds !== null) {
    for (const id of ids) {
      if (!seenIds.has(id)) {
        entering.add(id);
      }
    }
  }

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    for (const id of ids) {
      seen.current.add(id);
    }
  });

  return entering;
}

// True for the render in which `value` differs from the previous one. Not true
// on the first render: a value cannot have "just changed" the moment it first
// appears, and treating it as changed would pulse the badge every time a screen
// opens.
//
// Same StrictMode reasoning as above — the comparison reads the ref, the effect
// writes it.
export function useValueChanged<T>(value: T): boolean {
  const previous = useRef<{ value: T } | null>(null);

  const previousValue = previous.current;

  const changed = previousValue !== null && previousValue.value !== value;

  useEffect(() => {
    previous.current = { value };
  }, [value]);

  return changed;
}
