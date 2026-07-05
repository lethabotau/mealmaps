import type { CampusArea } from "@mealmap/shared";

interface VantageBarProps {
  vantage: CampusArea;
  onChange: (value: CampusArea) => void;
}

const VANTAGE_CHIPS: Array<[CampusArea, string]> = [
  ["upper", "Upper campus"],
  ["lower", "Lower campus"],
];

export function VantageBar({ vantage, onChange }: VantageBarProps) {
  return (
    <div className="mm-order-slip-segment" style={{ margin: "22px 0 10px" }}>
      <span className="mm-order-slip-label">📍 I&apos;m near:</span>
      {VANTAGE_CHIPS.map(([value, label]) => {
        const active = vantage === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`mm-order-slip-chip${active ? " is-active" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
