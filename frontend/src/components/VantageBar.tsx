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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px 10px",
        margin: "22px 0 10px",
      }}
    >
      <span
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.5px",
          color: "#8a7d6c",
        }}
      >
        📍 I&apos;m near:
      </span>
      {VANTAGE_CHIPS.map(([value, label]) => {
        const active = vantage === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            style={{
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 11,
              lineHeight: 1.2,
              padding: "4px 11px",
              borderRadius: 999,
              border: active ? "1.5px solid #1B1712" : "1px solid #d8ccb4",
              background: active ? "#FBF7EE" : "transparent",
              color: active ? "#1B1712" : "#8a7d6c",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
