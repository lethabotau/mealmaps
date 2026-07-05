import { chipColors } from "../lib/uiHelpers";

interface MultiSelectChipsProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}

export function MultiSelectChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectChipsProps<T>) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "1px",
          color: "var(--mm-muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          const colors = chipColors(active);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className="mm-chip-btn"
              style={{ background: colors.bg, color: colors.color }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
