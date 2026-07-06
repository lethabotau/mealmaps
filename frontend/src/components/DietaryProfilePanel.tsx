import { useId, useState } from "react";
import {
  ALLERGEN_LABELS,
  DIET_TAG_LABELS,
  type Allergen,
  type DietaryProfile,
  type DietTag,
} from "@mealmap/shared";
import { MultiSelectChips } from "./MultiSelectChips";

const DIET_TAG_OPTIONS = (Object.keys(DIET_TAG_LABELS) as DietTag[]).map((value) => ({
  value,
  label: DIET_TAG_LABELS[value],
}));
const ALLERGEN_OPTIONS = (Object.keys(ALLERGEN_LABELS) as Allergen[]).map((value) => ({
  value,
  label: ALLERGEN_LABELS[value],
}));

interface DietaryProfilePanelProps {
  profile: DietaryProfile;
  onToggleAllergen: (allergen: Allergen) => void;
  onToggleTag: (tag: DietTag) => void;
}

export function DietaryProfilePanel({
  profile,
  onToggleAllergen,
  onToggleTag,
}: DietaryProfilePanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const activeCount = profile.avoidAllergens.length + profile.wantTags.length;

  return (
    <div className="mm-panel" style={{ margin: "0 0 8px", padding: "14px 16px" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "1px",
            color: "var(--mm-ink)",
            fontWeight: 600,
          }}
        >
          🌱 MY DIETARY PROFILE{activeCount > 0 ? ` (${activeCount})` : ""}
        </span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          id={panelId}
          style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <MultiSelectChips
            label="AVOID THESE ALLERGENS"
            options={ALLERGEN_OPTIONS}
            selected={profile.avoidAllergens}
            onToggle={onToggleAllergen}
          />
          <MultiSelectChips
            label="ONLY SHOW THESE DIETS"
            options={DIET_TAG_OPTIONS}
            selected={profile.wantTags}
            onToggle={onToggleTag}
          />
        </div>
      )}
    </div>
  );
}
