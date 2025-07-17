export interface PersoI18nViewerConfig {
  localesPath: string; // 상대 또는 절대 경로
  locales: string[]; // ["en", "ko", ...] (선택적)
  defaultLocale: string; // "en" 등
}

const PORTAL_CONFIG: PersoI18nViewerConfig = {
  localesPath: "apps/portal/messages/${locale}.json",
  locales: ["en", "ko"],
  defaultLocale: "en",
};

const STUDIO_CONFIG: PersoI18nViewerConfig = {
  localesPath: "src/locales/${locale}/translation.json",
  locales: ["en", "ko"],
  defaultLocale: "ko",
};

export function loadConfig(
  projectName: "portal" | "studio"
): PersoI18nViewerConfig {
  switch (projectName) {
    case "portal":
      return PORTAL_CONFIG;
    case "studio":
      return STUDIO_CONFIG;
  }
}
