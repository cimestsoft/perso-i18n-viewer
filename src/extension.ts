import * as vscode from "vscode";
import { loadConfig } from "./config";
import { I18nManager } from "./i18nManager";
import { I18nDecorationProvider } from "./decorationProvider";
import { I18nSidebarProvider } from "./sidebarProvider";
import * as path from "path";
import * as fs from "fs";

export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) return; // 열린 폴더가 없으면 종료

  // package.json 확인하여 "perso-mono-front" 프로젝트인지 검사
  const packageJsonPath = path.join(workspace.uri.fsPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return; // package.json이 없으면 extension 비활성화
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
      return; // name이 "perso-mono-front" 또는 "perso-frontend"가 아니면 extension 비활성화
    }
  } catch (error) {
    console.error("Error reading package.json:", error);
    return; // package.json 읽기 실패 시 extension 비활성화
  }

  let config = loadConfig(projectName);
  const i18nManager = new I18nManager(workspace, config, refresh);
  const decorator = new I18nDecorationProvider(
    i18nManager,
    config.defaultLocale
  );

  // 사이드바 뷰 등록
  const sidebarProvider = new I18nSidebarProvider(decorator);
  vscode.window.registerTreeDataProvider(
    "persoi18nviewer-actions",
    sidebarProvider
  );

  /* 명령 등록 */
  context.subscriptions.push(
    vscode.commands.registerCommand("persoi18nviewer.togglePreview", () => {
      decorator.toggle();
      sidebarProvider.refresh(); // 토글 시 사이드바 갱신
    }),
    vscode.commands.registerCommand(
      "persoi18nviewer.selectLanguage",
      async () => {
        const pick = await vscode.window.showQuickPick(
          i18nManager.languages(),
          {
            placeHolder: "언어를 선택하세요",
          }
        );
        if (pick) decorator.setLanguage(pick);
      }
    ),
    vscode.commands.registerCommand("persoi18nviewer.reload", () => {
      config = loadConfig(projectName); // config 재로드 (폴더 경로 변경 가능)
      i18nManager.reload(config);
    })
  );

  function refresh() {
    decorator.refreshActive();
  }
}

export function deactivate() {
  /* nothing */
}
