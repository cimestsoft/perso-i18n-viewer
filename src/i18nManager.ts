import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { PersoI18nViewerConfig } from "./config";

export class I18nManager {
  private translations = new Map<string, Record<string, string>>();
  private watcher?: vscode.FileSystemWatcher;

  constructor(
    private readonly workspace: vscode.WorkspaceFolder,
    private config: PersoI18nViewerConfig,
    private readonly onReload: () => void
  ) {
    this.loadAll();
    this.createWatcher();
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

  public reload(config?: PersoI18nViewerConfig) {
    if (config) this.config = config;
    this.translations.clear();
    this.loadAll();
    this.onReload();
  }

  // --- private -----------------------------------------------------------

  private loadAll() {
    this.config.locales.forEach((locale) => {
      const filePath = this.config.localesPath.replace("${locale}", locale);

      const absFilePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.workspace.uri.fsPath, filePath);

      if (!fs.existsSync(absFilePath)) {
        console.warn(`Locale file not found: ${absFilePath}`);
        return;
      }

      try {
        const raw = fs.readFileSync(absFilePath, "utf-8");
        this.translations.set(locale, JSON.parse(raw));
      } catch (error) {
        // Ignore malformed JSON files
        console.error(`Error reading locale file ${absFilePath}:`, error);
      }
    });
  }

  private createWatcher() {
    // localesPath에서 디렉터리 경로 추출 (${locale} 부분을 제거)
    const templatePath = this.config.localesPath.replace("${locale}", "*");
    const workspacePath = this.workspace.uri.fsPath;

    // 디렉터리 경로와 파일명 패턴 분리

    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspacePath, templatePath)
    );

    const reload = () => this.reload();
    this.watcher.onDidChange(reload);
    this.watcher.onDidCreate(reload);
    this.watcher.onDidDelete(reload);
  }
}
