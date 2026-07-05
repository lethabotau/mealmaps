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
              <span className="mm-order-slip-label">{group.name}</span>
            ) : null}
            {isToggle ? (
              group.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={option.onClick}
                  className={`mm-order-slip-chip mm-order-slip-toggle${
                    option.bg === "#1B1712" ? " is-active" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="mm-order-slip-segmented">
                {group.options.map((option, index) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={option.onClick}
                    className="mm-order-slip-segment-btn"
                    style={{
                      background: option.bg,
                      color: option.color,
                      borderRight:
                        index < group.options.length - 1
                          ? "1.5px solid #1B1712"
                          : "none",
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
