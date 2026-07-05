import type { UserIdentity } from "./types.js";

/** Plausible seed authors — not real users; used only for demo tickets. */
export const SEED_AUTHORS = {
  csClub: { userId: "seed_cs_club", displayName: "Alex M. (CS Club)" },
  physics: { userId: "seed_physics", displayName: "Physics Dept Desk" },
  library: { userId: "seed_library", displayName: "Library Services" },
  coop: { userId: "seed_coop", displayName: "Student Co-op" },
  career: { userId: "seed_career", displayName: "Career Center" },
  lsu: { userId: "seed_lsu", displayName: "Latin Student Union" },
  sigma: { userId: "seed_sigma", displayName: "Sigma Chi Tabler" },
} satisfies Record<string, UserIdentity>;
