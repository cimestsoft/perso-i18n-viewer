import * as vscode from "vscode";
import { I18nManager } from "./i18nManager";
import debounce from "lodash/debounce";

export class I18nDecorationProvider {
  private readonly decorationType =
    vscode.window.createTextEditorDecorationType({
      after: { color: "white", fontStyle: "italic" },
    });

  private enabled = true;
  private currentLanguage: string;

  constructor(
    private readonly i18n: I18nManager,
    defaultLanguage: string,
    private onSetLanguage?: (lang: string) => void
  ) {
    this.currentLanguage = defaultLanguage;
    this.onSetLanguage = onSetLanguage;

    const debouncedRefresh = debounce(() => this.refreshActive(), 500);

    vscode.window.onDidChangeActiveTextEditor(() => this.refreshActive());
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        debouncedRefresh();
      }
    });
    this.refreshActive();
  }

  /** 사용자가 토글했을 때 */
  toggle() {
    this.enabled = !this.enabled;
    this.refreshActive();
    return this.enabled;
  }

  setLanguage(lang: string) {
    this.currentLanguage = lang;
    this.onSetLanguage?.(lang);
    this.refreshActive();
  }

  refreshActive() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    if (!this.enabled || !this.isValidDocument(editor.document)) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    // t() 형식의 문자열 체크 regex
    // const regex = /t\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    // 모든 '...', "..." 형식의 문자열 체크
    const regex = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;
    const decos: vscode.DecorationOptions[] = [];

    const text = editor.document.getText();
    for (const match of text.matchAll(regex)) {
      try {
        // Escape sequence(\n, \t 등) 처리를 위해 plain text를 JSON.parse로 변환
        const key = JSON.parse('"' + match[0].slice(1, -1) + '"') as string;
        const localized = this.i18n.t(this.currentLanguage, key);
        if (!localized) continue;

        const startPos = editor.document.positionAt(match.index!);
        const endPos = editor.document.positionAt(
          match.index! + match[0].length
        );

        decos.push({
          range: new vscode.Range(startPos, endPos),
          renderOptions: {
            after: {
              // Escape sequence를 plain text로 변환
              contentText: `➡ ${JSON.stringify(localized).slice(1, -1)}`,
            },
          },
        });
      } catch (e) {
        // JSON.parse 에러 무시
        console.error("Error parsing JSON:", e);
      }
    }

    editor.setDecorations(this.decorationType, decos);
  }

  dispose() {
    this.decorationType.dispose();
  }

  getEnabled() {
    return this.enabled;
  }

  private isValidDocument(doc: vscode.TextDocument) {
    return [
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact",
    ].includes(doc.languageId);
  }
}
