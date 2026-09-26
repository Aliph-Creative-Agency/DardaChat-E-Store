"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  /** Accessible name of the tab list (e.g. "Product details"). */
  label: string;
  tabs: TabItem[];
  /** Uncontrolled initial tab id (default: first enabled tab). */
  defaultValue?: string;
  /** Controlled selected tab id. */
  value?: string;
  onValueChange?: (id: string) => void;
  className?: string;
};

/**
 * WAI-ARIA tabs (automatic activation). Roving tabindex: only the selected tab is in the Tab order; Arrow keys move
 * in the VISUAL direction, so on an Arabic page ArrowLeft goes to the next tab (tabs run right-to-left), Home/End
 * jump to the first/last. Panels are focusable so their content is reachable right after the tab list.
 */
export function Tabs({ label, tabs, defaultValue, value, onValueChange, className }: TabsProps) {
  const baseId = useId();
  const firstEnabled = tabs.find((tab) => !tab.disabled)?.id ?? tabs[0]?.id;
  const [inner, setInner] = useState(defaultValue ?? firstEnabled);
  const selected = value ?? inner;
  const listRef = useRef<HTMLDivElement>(null);

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  function select(id: string, focus: boolean) {
    if (value === undefined) setInner(id);
    onValueChange?.(id);
    if (focus) document.getElementById(tabId(id))?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = tabs.filter((tab) => !tab.disabled);
    const ids = enabled.map((tab) => tab.id);
    const index = ids.indexOf(selected ?? "");
    const first = ids[0];
    const last = ids[ids.length - 1];
    if (index < 0 || first === undefined || last === undefined) return;
    const rtl = listRef.current ? getComputedStyle(listRef.current).direction === "rtl" : false;
    const step = (delta: number) => ids[(index + delta + ids.length) % ids.length] ?? first;
    let next: string | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = step(rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = step(rtl ? 1 : -1);
        break;
      case "Home":
        next = first;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next, true);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex max-w-full gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.id, false)}
              className={cn(
                "-mb-px inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-4 font-semibold whitespace-nowrap",
                "focus-visible:-outline-offset-3", // the tab list scrolls horizontally, which would clip an outer ring
                "transition-colors duration-fast ease-soft disabled:cursor-not-allowed disabled:opacity-55",
                isSelected ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={panelId(tab.id)}
          aria-labelledby={tabId(tab.id)}
          tabIndex={0}
          hidden={tab.id !== selected}
          className="rounded-control"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
