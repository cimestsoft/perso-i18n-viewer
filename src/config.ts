import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export interface PersoI18nViewerConfig {
  project: "portal" | "studio"; // "portal" 또는 "studio"
  localesPath: string; // 상대 또는 절대 경로
  locales: string[]; // ["en", "ko", ...]
  defaultLocale: string; // "en" 등
  fetchTranslationInfo: {
    localeColumns: string[]; // ["Korean", "English"]
    driveItemId: string;
    driveId: string;
    sheetId: string;
  };
}

const PORTAL_CONFIG: PersoI18nViewerConfig = {
  project: "portal",
  localesPath: "apps/portal/messages/${locale}.json",
  locales: ["en", "ko"],
  defaultLocale: "ko",
  fetchTranslationInfo: {
    localeColumns: ["English", "Korean"],
    driveItemId: "015XQXWIDOQCWXLRJ46VGYPZWCZBVKQHLO",
    driveId:
      "b!MKvRnGvW7kyKOrRDaeGPWKtI7x9Kr2RLlbREChYRQlgGMIAZKtb6RII9kQhIzC7p",
    sheetId: "{F128438D-B66E-BF4F-8F37-800C8F44FE9F}",
  },
};

const STUDIO_CONFIG: PersoI18nViewerConfig = {
  project: "studio",
  localesPath: "src/locales/${locale}/translation.json",
  locales: ["en", "ko"],
  defaultLocale: "ko",
  fetchTranslationInfo: {
    localeColumns: ["en", "ko"],
    driveItemId: "01AVD2GEBO4VKZH4T4VJGYKLXMVV3YBETS",
    driveId:
      "b!L6lr13fgLUCVX5SiqAHK2AlK6VhofXJItkLK9qZ_iUcgXVHDtAcEQJgT0xO11QEF",
    sheetId: "{CD368812-E153-FB4C-842F-769D901518E4}",
  },
};

export function loadConfig(
  workspace?: vscode.WorkspaceFolder
): PersoI18nViewerConfig | null {
  // workspace가 없으면 현재 작업영역에서 가져오기
  if (!workspace) {
    workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) return null; // 열린 폴더가 없으면 null 반환
  }

  // package.json 확인하여 프로젝트 타입 검사
  const packageJsonPath = path.join(workspace.uri.fsPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null; // package.json이 없으면 null 반환
  }

  let projectName: "portal" | "studio";

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.name === "perso-mono-front") {
      projectName = "portal";
    } else if (packageJson.name === "perso-frontend") {
      projectName = "studio";
    } else {
      return null; // name이 "perso-mono-front" 또는 "perso-frontend"가 아니면 null 반환
    }
  } catch (error) {
    console.error("Error reading package.json:", error);
    return null; // package.json 읽기 실패 시 null 반환
  }

  switch (projectName) {
    case "portal":
      return PORTAL_CONFIG;
    case "studio":
      return STUDIO_CONFIG;
  }
}
