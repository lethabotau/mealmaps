import type { Filters } from "@mealmap/shared";

export interface FilterOption {
  label: string;
  bg: string;
  color: string;
  onClick: () => void;
}

export interface FilterGroup {
  name: string;
  kind?: "segmented" | "toggle";
  options: FilterOption[];
}

export function buildFilterGroups(
  filters: Filters,
  setFilter: (key: keyof Filters, value: Filters[keyof Filters]) => void,
): FilterGroup[] {
  const chip = (active: boolean) =>
    active
      ? { bg: "#1B1712", color: "#FBF7EE" }
      : { bg: "transparent", color: "#1B1712" };

  const groups: Array<{
    name: string;
    kind?: "segmented" | "toggle";
    key?: keyof Filters;
    opts: Array<[Filters[keyof Filters], string]>;
  }> = [
    {
      name: "",
      kind: "toggle",
      opts: [[filters.freeOnly as Filters[keyof Filters], "Free only"]],
    },
    {
      name: "WHEN",
      key: "time",
      opts: [
        ["now", "Now"],
        ["hour", "Next hour"],
        ["today", "Today"],
      ],
    },
  ];

  return groups.map((group) => ({
    name: group.name,
    kind: group.kind ?? "segmented",
    options: group.opts.map(([value, label]) => {
      const active =
        group.kind === "toggle"
          ? filters.freeOnly
          : group.key
            ? filters[group.key] === value
            : false;
      const colors = chip(active);
      return {
        label,
        ...colors,
        onClick: () => {
          if (group.kind === "toggle") {
            setFilter("freeOnly", !filters.freeOnly);
            return;
          }
          if (group.key) setFilter(group.key, value);
        },
      };
    }),
  }));
}

export const REPORT_TOAST: Record<string, string> = {
  still: "Marked still available — thanks!",
  gone: "Reported gone. Others will see it now.",
  queue: "Long queue noted on the ticket.",
  members: "Access updated → members only.",
  all: "Access updated → open to all.",
};
