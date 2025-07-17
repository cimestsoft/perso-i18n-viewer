import * as vscode from "vscode";
import { PersoI18nViewerConfig } from "../config";
import { FETCH_TRANSLATION_TOKEN_KEY } from "./const";

export class I18nTranslationFetcher {
  constructor(
    private config: PersoI18nViewerConfig,
    private context: vscode.ExtensionContext
  ) {}

  async fetchTranslations() {
    const url = "https://example.com"; // 실제 URL로 변경 필요
    const uri = vscode.Uri.parse(url);

    // 클립보드에 URL 복사
    // await vscode.env.clipboard.writeText(url);

    // // 외부 브라우저에서 URL 열기
    // await vscode.env.openExternal(uri);

    const token = this.context.globalState.get<string>(
      FETCH_TRANSLATION_TOKEN_KEY
    );
  }
}
