import * as vscode from "vscode";
import { loadConfig } from "./config";
import { I18nManager } from "./i18nManager";
import { I18nDecorationProvider } from "./decorationProvider";
import { I18nSidebarProvider } from "./sidebarProvider";
import * as path from "path";

export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) return; // 열린 폴더가 없으면 종료

  let config = loadConfig(workspace);
  const i18nManager = new I18nManager(workspace, config, refresh);
  const decorator = new I18nDecorationProvider(
    i18nManager,
    config.defaultLocale
  );

  // config 파일 변경 감지 및 번역 리로드
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      path.join(workspace.uri.fsPath, ".vscode"),
      "persoi18nviewer.json"
    )
  );
  const reloadConfig = () => {
    config = loadConfig(workspace);
    i18nManager.reload(config);
  };
  configWatcher.onDidChange(reloadConfig);
  configWatcher.onDidCreate(reloadConfig);
  configWatcher.onDidDelete(reloadConfig);
  context.subscriptions.push(configWatcher);

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
      config = loadConfig(workspace); // config 재로드 (폴더 경로 변경 가능)
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
