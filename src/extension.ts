import * as vscode from "vscode";
import { loadConfig } from "./config";
import { I18nManager } from "./i18nManager";
import { I18nDecorationProvider } from "./decorationProvider";
import { I18nSidebarProvider } from "./sidebarProvider";
import { WORKSPACE_LOCALE_KEY } from "./const";
import { I18nTranslationFetcher } from "./translationFetcher";
import { GraphClientManager } from "./translationFetcher/graphClientManager";

export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders?.[0];

  // 프로젝트 초기화 및 설정 로드
  let config = await loadConfig(workspace);
  if (!config || !workspace) {
    return; // 지원하지 않는 프로젝트거나 초기화 실패 시 extension 비활성화
  }
  const i18nManager = new I18nManager(workspace, config, refresh);
  await i18nManager.initialize();

  const savedLocale =
    context.workspaceState.get<string>(WORKSPACE_LOCALE_KEY) ?? "";
  const initialLocale = i18nManager.languages().includes(savedLocale)
    ? savedLocale
    : config.defaultLocale;

  const decorator = new I18nDecorationProvider(
    i18nManager,
    initialLocale,
    saveSelectedLanguage
  );

  // 사이드바 뷰 등록
  const sidebarProvider = new I18nSidebarProvider(decorator);
  vscode.window.registerTreeDataProvider(
    "persoi18nviewer-actions",
    sidebarProvider
  );

  const graphClientManager = new GraphClientManager(context);
  const translationFetcher = new I18nTranslationFetcher(
    config,
    graphClientManager
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
    vscode.commands.registerCommand("persoi18nviewer.reload", async () => {
      const newConfig = await loadConfig(workspace); // config 재로드 (폴더 경로 변경 가능)
      if (newConfig) {
        config = newConfig;
        await i18nManager.reload(config);
      }
    }),
    vscode.commands.registerCommand("persoi18nviewer.fetchTranslations", () =>
      translationFetcher.fetchTranslations()
    )
  );

  function saveSelectedLanguage(lang: string) {
    context.workspaceState.update(WORKSPACE_LOCALE_KEY, lang);
  }

  function refresh() {
    decorator.refreshActive();
  }
}

export function deactivate() {
  /* nothing */
}
