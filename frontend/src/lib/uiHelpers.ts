import type { Filters } from "@mealmap/shared";

export interface FilterOption {
  label: string;
  bg: string;
  color: string;
  onClick: () => void;
}

export interface FilterGroup {
  name: string;
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
    key: keyof Filters;
    opts: Array<[Filters[keyof Filters], string]>;
  }> = [
    {
      name: "BUDGET",
      key: "budget",
      opts: [
        ["free", "$0"],
        ["u5", "Under $5"],
        ["u10", "Under $10"],
      ],
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
    {
      name: "AREA",
      key: "area",
      opts: [
        ["quad", "Quad"],
        ["library", "Library"],
        ["lower", "Lower Campus"],
        ["anywhere", "Anywhere"],
      ],
    },
  ];

  return groups.map((group) => ({
    name: group.name,
    options: group.opts.map(([value, label]) => {
      const active = filters[group.key] === value;
      const colors = chip(active);
      return {
        label,
        ...colors,
        onClick: () => setFilter(group.key, value),
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
