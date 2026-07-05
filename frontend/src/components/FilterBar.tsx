import type { FilterGroup } from "../lib/uiHelpers";

interface FilterBarProps {
  groups: FilterGroup[];
  /** When true, renders only the filter controls (for embedding in another panel). */
  embedded?: boolean;
}

export function FilterBar({ groups, embedded = false }: FilterBarProps) {
  const inner = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: embedded ? "20px 28px" : "22px 30px" }}>
        {groups.map((group) => (
          <div
            key={group.name}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 11,
                letterSpacing: "2px",
                color: "#8a7d6c",
              }}
            >
              {group.name}
            </span>
            <div
              style={{
                display: "inline-flex",
                border: "2px solid #1B1712",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {group.options.map((option, index) => (
                <button
                  key={option.label}
                  onClick={option.onClick}
                  style={{
                    fontFamily: "Archivo",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    borderRight:
                      index < group.options.length - 1
                        ? "2px solid #1B1712"
                        : "none",
                    cursor: "pointer",
                    padding: "8px 13px",
                    background: option.bg,
                    color: option.color,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
  );

  if (embedded) return inner;

  return (
    <div className="mm-panel" style={{ margin: "30px 0 8px", padding: "18px 20px" }}>
      {inner}
    </div>
  );
}
