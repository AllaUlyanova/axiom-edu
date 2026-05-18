// Pastel theming per subject — central place so UI is consistent.
export type SubjectTheme = {
  bg: string;
  text: string;
  ring: string;
  gradient: string;
  emoji: string;
};

const THEMES: Record<string, SubjectTheme> = {
  math: {
    bg: "bg-[oklch(0.94_0.05_230)]",
    text: "text-[oklch(0.30_0.10_230)]",
    ring: "ring-[oklch(0.62_0.18_230)]",
    gradient: "from-[oklch(0.94_0.06_230)] to-[oklch(0.95_0.06_200)]",
    emoji: "🧮",
  },
  russian: {
    bg: "bg-[oklch(0.94_0.05_15)]",
    text: "text-[oklch(0.32_0.12_15)]",
    ring: "ring-[oklch(0.62_0.18_15)]",
    gradient: "from-[oklch(0.94_0.06_15)] to-[oklch(0.94_0.06_50)]",
    emoji: "📖",
  },
  reading: {
    bg: "bg-[oklch(0.94_0.06_50)]",
    text: "text-[oklch(0.32_0.12_50)]",
    ring: "ring-[oklch(0.62_0.16_50)]",
    gradient: "from-[oklch(0.94_0.07_50)] to-[oklch(0.95_0.07_100)]",
    emoji: "📚",
  },
  world: {
    bg: "bg-[oklch(0.93_0.06_155)]",
    text: "text-[oklch(0.30_0.10_155)]",
    ring: "ring-[oklch(0.62_0.16_155)]",
    gradient: "from-[oklch(0.93_0.07_155)] to-[oklch(0.94_0.07_200)]",
    emoji: "🌍",
  },
  english: {
    bg: "bg-[oklch(0.93_0.06_280)]",
    text: "text-[oklch(0.32_0.12_280)]",
    ring: "ring-[oklch(0.62_0.18_280)]",
    gradient: "from-[oklch(0.93_0.07_280)] to-[oklch(0.94_0.07_320)]",
    emoji: "🇬🇧",
  },
  music: {
    bg: "bg-[oklch(0.94_0.06_320)]",
    text: "text-[oklch(0.32_0.12_320)]",
    ring: "ring-[oklch(0.62_0.18_320)]",
    gradient: "from-[oklch(0.94_0.07_320)] to-[oklch(0.94_0.07_280)]",
    emoji: "🎵",
  },
  tech: {
    bg: "bg-[oklch(0.93_0.06_100)]",
    text: "text-[oklch(0.32_0.12_100)]",
    ring: "ring-[oklch(0.62_0.16_100)]",
    gradient: "from-[oklch(0.93_0.08_100)] to-[oklch(0.94_0.07_140)]",
    emoji: "🛠️",
  },
};

export function getSubjectTheme(slug: string): SubjectTheme {
  return THEMES[slug] ?? THEMES.math;
}
