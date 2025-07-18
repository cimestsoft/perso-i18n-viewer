import * as vscode from "vscode";
import { PersoI18nViewerConfig } from "../config";
import { GraphClientManager } from "./graphClientManager";
import * as fs from "fs";
import * as path from "path";

export class I18nTranslationFetcher {
  private graphClientManager: GraphClientManager;

  constructor(
    private config: PersoI18nViewerConfig,
    context: vscode.ExtensionContext
  ) {
    this.graphClientManager = new GraphClientManager(context);
  }

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

      locales.forEach((lang) => {
        // fs를 사용해서 파일 덮어쓰기
        const filePath = this.config.localesPath.replace("${locale}", lang);
        const absFilePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(
              vscode.workspace.workspaceFolders![0].uri.fsPath,
              filePath
            );
        fs.mkdirSync(path.dirname(absFilePath), { recursive: true });
        fs.writeFileSync(
          absFilePath,
          JSON.stringify(json[lang], null, 2) +
            // 스튜디오 프로젝트는 끝에 줄바꿈 추가
            (preset === "studio" ? "\n" : ""),
          "utf-8"
        );
      });
      vscode.window.showInformationMessage(
        "다국어 파일이 성공적으로 업데이트되었습니다."
      );
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `다국어 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
      );
    }
  }
}
