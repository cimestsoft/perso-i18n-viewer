import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export interface PersoI18nViewerConfig {
  localesPath: string; // 상대 또는 절대 경로
  locales: string[]; // ["en", "ko", ...] (선택적)
  defaultLocale: string; // "en" 등
}

const PORTAL_CONFIG: PersoI18nViewerConfig = {
  localesPath: "apps/portal/messages/${locale}.json",
  locales: ["en", "ko"],
  defaultLocale: "ko",
};

const STUDIO_CONFIG: PersoI18nViewerConfig = {
  localesPath: "src/locales/${locale}/translation.json",
  locales: ["en", "ko"],
  defaultLocale: "ko",
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
