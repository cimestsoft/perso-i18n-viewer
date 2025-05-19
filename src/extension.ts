import * as vscode from "vscode";
import { loadConfig } from "./config";
import { I18nManager } from "./i18nManager";
import { I18nDecorationProvider } from "./decorationProvider";

export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) return; // 열린 폴더가 없으면 종료

  let config = loadConfig(workspace);
  const i18nManager = new I18nManager(workspace, config, refresh);
  const decorator = new I18nDecorationProvider(
    i18nManager,
    config.defaultLanguage
  );

  /* 명령 등록 */
  context.subscriptions.push(
    vscode.commands.registerCommand("persoi18nviewer.togglePreview", () => {
      decorator.toggle();
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
