import type { Filters } from "@mealmap/shared";

/** Shared active/inactive chip colors, used by AddFoodModal and dietary chips. */
export function chipColors(active: boolean): { bg: string; color: string } {
  return active
    ? { bg: "#E5431E", color: "#FBF7EE" }
    : { bg: "#FFFDF7", color: "#1B1712" };
}

export interface FilterOption {
  label: string;
  bg: string;
  color: string;
  active: boolean;
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
    key: keyof Filters;
    opts: Array<[Filters[keyof Filters], string]>;
  }> = [
    {
      name: "",
      kind: "toggle",
      key: "freeOnly",
      opts: [[true as Filters[keyof Filters], "Free only"]],
    },
    {
      name: "",
      kind: "toggle",
      key: "safeForMe",
      opts: [[true as Filters[keyof Filters], "Safe for me"]],
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
        group.kind === "toggle" ? Boolean(filters[group.key]) : filters[group.key] === value;
      const colors = chip(active);
      return {
        label,
        ...colors,
        active,
        onClick: () => {
          if (group.kind === "toggle") {
            setFilter(group.key, !filters[group.key]);
            return;
          }
          setFilter(group.key, value);
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
