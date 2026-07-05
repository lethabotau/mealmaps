import type { CampusArea } from "@mealmap/shared";
import type { FilterGroup } from "../lib/uiHelpers";

interface OrderSlipBarProps {
  vantage: CampusArea;
  onVantageChange: (value: CampusArea) => void;
  filterGroups: FilterGroup[];
}

const VANTAGE_CHIPS: Array<[CampusArea, string]> = [
  ["upper", "Upper campus"],
  ["lower", "Lower campus"],
];

export function OrderSlipBar({
  vantage,
  onVantageChange,
  filterGroups,
}: OrderSlipBarProps) {
  const toggleGroups = filterGroups.filter((group) => group.kind === "toggle");
  const whenGroup = filterGroups.find((group) => group.name === "WHEN");

  return (
    <div className="mm-order-slip">
      <div className="mm-order-slip-segment">
        <span className="mm-order-slip-label">📍 I&apos;m near:</span>
        {VANTAGE_CHIPS.map(([value, label]) => {
          const active = vantage === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              className={`mm-order-slip-chip${active ? " is-active" : ""}`}
              onClick={() => onVantageChange(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <span className="mm-order-slip-dot" aria-hidden>
        ·
      </span>

      {toggleGroups.flatMap((group) => group.options).map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={option.active}
          className={`mm-order-slip-chip mm-order-slip-toggle${
            option.active ? " is-active" : ""
          }`}
          onClick={option.onClick}
        >
          {option.label}
        </button>
      ))}

      <span className="mm-order-slip-dot" aria-hidden>
        ·
      </span>

      <div className="mm-order-slip-segment">
        <span className="mm-order-slip-label">WHEN</span>
        <div className="mm-order-slip-segmented">
          {whenGroup?.options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={option.active}
              className="mm-order-slip-segment-btn"
              onClick={option.onClick}
              style={{
                background: option.bg,
                color: option.color,
                borderRight:
                  index < (whenGroup.options.length - 1)
                    ? "1.5px solid #1B1712"
                    : "none",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
