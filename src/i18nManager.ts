import * as vscode from "vscode";
import { PersoI18nViewerConfig } from "./config";

export class I18nManager {
  private translations = new Map<string, Record<string, string>>();
  private watcher?: vscode.FileSystemWatcher;

  constructor(
    private readonly workspace: vscode.WorkspaceFolder,
    private config: PersoI18nViewerConfig,
    private readonly onReload: () => void
  ) {
    // constructor에서는 동기 작업만 수행
    this.createWatcher();
  }

  async initialize() {
    await this.loadAll();
  }

  dispose() {
    this.watcher?.dispose();
  }

  /** key → localized value (또는 undefined) */
  public t(lang: string, key: string): string | undefined {
    return this.translations.get(lang)?.[key];
  }

  public languages(): string[] {
    return [...this.translations.keys()];
  }

  public async reload(config?: PersoI18nViewerConfig) {
    if (config) this.config = config;
    this.translations.clear();
    await this.loadAll();
    this.onReload();
  }

  // --- private -----------------------------------------------------------

  private async loadAll() {
    await Promise.all(
      this.config.locales.map(async (locale) => {
        const filePath = this.config.localesPath.replace("${locale}", locale);

        // config.localesPath는 항상 상대 경로이므로 workspace.uri와 결합
        const fileUri = vscode.Uri.joinPath(this.workspace.uri, filePath);

        try {
          await vscode.workspace.fs.stat(fileUri);
        } catch (error) {
          console.warn(`Locale file not found: ${fileUri.fsPath}`);
          return;
        }

        try {
          const fileContent = await vscode.workspace.fs.readFile(fileUri);
          const fileText = new TextDecoder().decode(fileContent);
          this.translations.set(locale, JSON.parse(fileText));
        } catch (error) {
          // Ignore malformed JSON files
          console.error(`Error reading locale file ${fileUri.fsPath}:`, error);
        }
      })
    );
  }

  private createWatcher() {
    // localesPath에서 디렉터리 경로 추출 (${locale} 부분을 제거)
    const templatePath = this.config.localesPath.replace("${locale}", "*");

    // 디렉터리 경로와 파일명 패턴 분리
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspace, templatePath)
    );

    const reload = () => this.reload();
    this.watcher.onDidChange(reload);
    this.watcher.onDidCreate(reload);
    this.watcher.onDidDelete(reload);
  }
}
