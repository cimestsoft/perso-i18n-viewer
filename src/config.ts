import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export interface PersoI18nViewerConfig {
  localesPath: string; // 상대 또는 절대 경로
  defaultLanguage: string; // "en" 등
}

const DEFAULT_CONFIG: PersoI18nViewerConfig = {
  localesPath: "apps/portal/messages",
  defaultLanguage: "en",
};

export function loadConfig(
  workspace: vscode.WorkspaceFolder
): PersoI18nViewerConfig {
  const helperPath = path.join(
    workspace.uri.fsPath,
    ".vscode",
    "persoi18nviewer.json"
  );
  try {
    const raw = fs.readFileSync(helperPath, "utf-8");
    const json = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...json };
  } catch {
    return DEFAULT_CONFIG;
  }
}
