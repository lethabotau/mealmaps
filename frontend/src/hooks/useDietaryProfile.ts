import { useCallback, useState } from "react";
import { DEFAULT_DIETARY_PROFILE, type Allergen, type DietaryProfile, type DietTag } from "@mealmap/shared";

const STORAGE_KEY = "mealmap:dietary-profile";

function readProfile(): DietaryProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DIETARY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<DietaryProfile>;
    return {
      avoidAllergens: Array.isArray(parsed.avoidAllergens) ? parsed.avoidAllergens : [],
      wantTags: Array.isArray(parsed.wantTags) ? parsed.wantTags : [],
    };
  } catch {
    return DEFAULT_DIETARY_PROFILE;
  }
}

function writeProfile(profile: DietaryProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useDietaryProfile() {
  const [profile, setProfile] = useState<DietaryProfile>(() => readProfile());

  const toggleAllergen = useCallback((allergen: Allergen) => {
    setProfile((prev) => {
      const has = prev.avoidAllergens.includes(allergen);
      const next: DietaryProfile = {
        ...prev,
        avoidAllergens: has
          ? prev.avoidAllergens.filter((a) => a !== allergen)
          : [...prev.avoidAllergens, allergen],
      };
      writeProfile(next);
      return next;
    });
  }, []);

  const toggleTag = useCallback((tag: DietTag) => {
    setProfile((prev) => {
      const has = prev.wantTags.includes(tag);
      const next: DietaryProfile = {
        ...prev,
        wantTags: has
          ? prev.wantTags.filter((t) => t !== tag)
          : [...prev.wantTags, tag],
      };
      writeProfile(next);
      return next;
    });
  }, []);

  return { profile, toggleAllergen, toggleTag };
}
