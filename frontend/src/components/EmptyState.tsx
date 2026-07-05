interface EmptyStateProps {
  onClearFilters: () => void;
  onOpenAdd: () => void;
}

export function EmptyState({ onClearFilters, onOpenAdd }: EmptyStateProps) {
  return (
    <div
      style={{
        maxWidth: 560,
        position: "relative",
        border: "2.5px dashed #1B1712",
        borderRadius: 14,
        background: "#FBF7EE",
        padding: "42px 30px",
        textAlign: "center",
        boxShadow: "4px 4px 0 rgba(27,23,18,0.15)",
      }}
    >
      <div
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 11,
          letterSpacing: "2px",
          color: "#a89a83",
          marginBottom: 14,
        }}
      >
        NO. ————
      </div>
      <div
        style={{
          fontFamily: "Archivo",
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: "-0.5px",
          marginBottom: 8,
        }}
      >
        No tickets match.
      </div>
      <div
        style={{
          fontFamily: "Archivo",
          fontSize: 15,
          color: "#8a7d6c",
          maxWidth: 340,
          margin: "0 auto 22px",
          lineHeight: 1.5,
        }}
      >
        Nothing on the pass fits those filters. Loosen one — or be the one who
        posts it.
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onClearFilters}
          style={{
            fontFamily: "Archivo",
            fontWeight: 700,
            fontSize: 14,
            background: "none",
            color: "#1B1712",
            border: "2.5px solid #1B1712",
            borderRadius: 8,
            cursor: "pointer",
            padding: "11px 18px",
          }}
        >
          Clear filters
        </button>
        <button
          onClick={onOpenAdd}
          style={{
            fontFamily: "Archivo",
            fontWeight: 800,
            fontSize: 14,
            background: "#E5431E",
            color: "#FBF7EE",
            border: "2.5px solid #1B1712",
            borderRadius: 8,
            boxShadow: "3px 3px 0 rgba(27,23,18,0.85)",
            cursor: "pointer",
            padding: "11px 18px",
          }}
        >
          + Found food
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 14,
          fontFamily: "Archivo",
          fontWeight: 900,
          fontSize: 20,
          color: "#d8ccb4",
          border: "3px solid #d8ccb4",
          borderRadius: 7,
          padding: "4px 10px",
          transform: "rotate(-8deg)",
        }}
      >
        VOID
      </div>
    </div>
  );
}
