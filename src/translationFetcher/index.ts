import * as vscode from "vscode";
import { PersoI18nViewerConfig } from "../config";
import {
  FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
  FETCH_TRANSLATION_TOKEN_KEY,
  PcaConfig,
} from "./const";
import { PublicClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import * as fs from "fs";
import * as path from "path";
export class I18nTranslationFetcher {
  constructor(
    private config: PersoI18nViewerConfig,
    private context: vscode.ExtensionContext
  ) {}

  async fetchTranslations() {
    const token = this.context.globalState.get<string>(
      FETCH_TRANSLATION_TOKEN_KEY
    );
    const expiresAt =
      this.context.globalState.get<number>(
        FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY
      ) ?? 0;

    // 토큰 만료를 체크하는데 1초 정도의 여유를 두기
    if (!token || expiresAt < Date.now() + 1000) {
      const pca = new PublicClientApplication(PcaConfig);

      try {
        const result = await pca.acquireTokenByDeviceCode({
          deviceCodeCallback: async (response) => {
            await vscode.env.clipboard.writeText(response.userCode);
            const uri = vscode.Uri.parse(response.verificationUri);
            await vscode.env.openExternal(uri);
          },
          scopes: ["Files.Read", "Files.ReadWrite", "Files.Read.All"],
          timeout: 120,
        });
        if (!result) {
          vscode.window.showErrorMessage(
            "인증에 실패했습니다. 다시 시도해주세요."
          );
          return;
        }
        await this.context.globalState.update(
          FETCH_TRANSLATION_TOKEN_KEY,
          result.accessToken
        );
        if (result.expiresOn)
          await this.context.globalState.update(
            FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
            result.expiresOn.getTime()
          );
      } catch (error: any) {
        if (error.errorCode === "user_timeout_reached") {
          vscode.window.showErrorMessage(
            "다국어 파일 인증 시간이 초과되었습니다. 다시 시도해주세요."
          );
        } else
          vscode.window.showErrorMessage(
            `인증 중 오류가 발생했습니다: ${error.message}`
          );
        return;
      }
    }

    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = this.context.globalState.get<string>(
            FETCH_TRANSLATION_TOKEN_KEY
          );
          if (!token) {
            throw new Error("인증 토큰이 없습니다. 다시 인증해주세요.");
          }
          return token;
        },
      },
    });

    try {
      const { project: preset, locales } = this.config;
      const { driveId, driveItemId, sheetId, localeColumns } =
        this.config.fetchTranslationInfo;
      const endPoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${driveItemId}/workbook/worksheets/${sheetId}/usedRange`;

      const values: string[][] = (await client.api(endPoint).get()).values;

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
      if (error.code === "InvalidAuthenticationToken") {
        vscode.window.showErrorMessage(
          "인증 토큰이 만료되었습니다. 다시 인증해주세요."
        );
        await this.context.globalState.update(
          FETCH_TRANSLATION_TOKEN_KEY,
          undefined
        );
      } else {
        vscode.window.showErrorMessage(
          `다국어 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
        );
      }
    }
  }
}
