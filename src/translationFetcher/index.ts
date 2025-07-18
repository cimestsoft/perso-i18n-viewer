import * as vscode from "vscode";
import { PersoI18nViewerConfig } from "../config";
import { GraphClientManager } from "./graphClientManager";

export class I18nTranslationFetcher {
  constructor(
    private config: PersoI18nViewerConfig,
    private graphClientManager: GraphClientManager
  ) {}

  async fetchTranslations() {
    try {
      const { project: preset, locales } = this.config;
      const { driveId, driveItemId, sheetId, localeColumns } =
        this.config.fetchTranslationInfo;
      const endPoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${driveItemId}/workbook/worksheets/${sheetId}/usedRange`;

      const values: string[][] = (
        await this.graphClientManager.executeApiCall((client) =>
          client.api(endPoint).get()
        )
      ).values;

      const headers = values.shift() as string[];
      const idxs = ["category", "key", ...localeColumns].map((name) =>
        headers.indexOf(name)
      );

      if (idxs.includes(-1))
        throw new Error(
          `Some columns are not found: ${idxs
            .filter((idx) => idx === -1)
            .join(", ")}`
        );
      const json: Record<string, Record<string, string>> = Object.fromEntries(
        this.config.locales.map((lang) => [lang, {}])
      );
      values.forEach((row) => {
        const [category, key, ...translations] = idxs.map((idx) => row[idx]);
        locales.map((lang, index) => {
          if (preset === "portal") {
            const k = key.replace(/[.]/g, "");
            json[lang][`${category}_${k}`] = String(translations[index]);
          } else {
            const k = key;
            json[lang][`${category}.${k}`] = translations[index];
          }
        });
      });

      for (const lang of locales) {
        // vscode.workspace.fs를 사용해서 파일 덮어쓰기
        const filePath = this.config.localesPath.replace("${locale}", lang);

        // 워크스페이스 확인
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("워크스페이스가 열려있지 않습니다.");
        }

        // 상대 경로를 워크스페이스 기준으로 변환
        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);

        // 파일 내용 작성
        const content =
          JSON.stringify(json[lang], null, 2) +
          // 스튜디오 프로젝트는 끝에 줄바꿈 추가
          (preset === "studio" ? "\n" : "");

        await vscode.workspace.fs.writeFile(
          fileUri,
          Buffer.from(content, "utf-8")
        );
      }
      vscode.window.showInformationMessage(
        "다국어 파일이 성공적으로 업데이트되었습니다."
      );
    } catch (error: any) {
      if (error.message === "사용자가 인증을 취소했습니다.") {
        vscode.window.showInformationMessage("인증이 취소되었습니다.");
        return;
      }
      vscode.window.showErrorMessage(
        `다국어 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
      );
    }
  }
}
