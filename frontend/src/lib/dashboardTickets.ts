import type { TicketView } from "@mealmap/shared";

export interface DashboardTicketLayout {
  /** Top picks duplicated on the hero board — not removed from the grid. */
  railPreview: TicketView[];
  /** Full filtered pass shown in the main grid. */
  gridTickets: TicketView[];
}

/** Split filtered views into a non-exclusive rail preview + full grid list. */
export function layoutDashboardTickets(
  views: TicketView[],
): DashboardTicketLayout {
  return {
    railPreview: views.slice(0, 3),
    gridTickets: views,
  };
}
