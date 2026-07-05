import type { FilterGroup } from "../lib/uiHelpers";

interface FilterBarProps {
  groups: FilterGroup[];
  /** When true, renders only the filter controls (for embedding in another panel). */
  embedded?: boolean;
}

export function FilterBar({ groups, embedded = false }: FilterBarProps) {
  const inner = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: embedded ? "20px 28px" : "22px 30px",
        alignItems: "flex-end",
      }}
    >
      {groups.map((group, groupIndex) => {
        const isToggle = group.kind === "toggle";

        return (
          <div
            key={group.name || `toggle-${groupIndex}`}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {group.name ? (
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
            ) : null}
            {isToggle ? (
              group.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={option.onClick}
                  style={{
                    fontFamily: "Archivo",
                    fontWeight: 600,
                    fontSize: 11,
                    lineHeight: 1.2,
                    padding: "4px 11px",
                    borderRadius: 999,
                    border:
                      option.bg === "#1B1712"
                        ? "1.5px solid #1B1712"
                        : "1px solid #d8ccb4",
                    background:
                      option.bg === "#1B1712" ? "#FBF7EE" : "transparent",
                    color:
                      option.bg === "#1B1712" ? "#1B1712" : "#8a7d6c",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
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
                    type="button"
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
            )}
          </div>
        );
      })}
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="mm-panel" style={{ margin: "0 0 8px", padding: "18px 20px" }}>
      {inner}
    </div>
  );
}
