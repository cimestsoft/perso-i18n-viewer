import * as vscode from "vscode";
import { PublicClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import {
  FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
  FETCH_TRANSLATION_TOKEN_KEY,
  PcaConfig,
} from "./const";

export class GraphClientManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 저장된 토큰이 유효한지 확인합니다.
   * @returns 유효한 토큰이 있으면 true, 없거나 만료되었으면 false
   */
  private isTokenValid(): boolean {
    const token = this.context.globalState.get<string>(
      FETCH_TRANSLATION_TOKEN_KEY
    );
    const expiresAt =
      this.context.globalState.get<number>(
        FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY
      ) ?? 0;

    // 토큰 만료를 체크하는데 1초 정도의 여유를 두기
    return !!(token && expiresAt >= Date.now() + 1000);
  }

  /**
   * 디바이스 코드 플로우를 통해 새로운 토큰을 획득합니다.
   */
  private async acquireNewToken(): Promise<string | null> {
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
        return null;
      }

      await this.context.globalState.update(
        FETCH_TRANSLATION_TOKEN_KEY,
        result.accessToken
      );

      if (result.expiresOn) {
        await this.context.globalState.update(
          FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
          result.expiresOn.getTime()
        );
      }

      return result.accessToken;
    } catch (error: any) {
      if (error.errorCode === "user_timeout_reached") {
        vscode.window.showErrorMessage(
          "다국어 파일 인증 시간이 초과되었습니다. 다시 시도해주세요."
        );
      } else {
        vscode.window.showErrorMessage(
          `인증 중 오류가 발생했습니다: ${error.message}`
        );
      }
      return null;
    }
  }

  /**
   * Microsoft Graph API 요청 시마다 호출되는 메서드입니다.
   * 토큰이 만료되었다면 자동으로 갱신합니다.
   * @returns 유효한 액세스 토큰 또는 오류 발생 시 예외
   */
  private async getAccessToken(): Promise<string> {
    // 현재 토큰이 유효한지 확인
    if (this.isTokenValid()) {
      const token = this.context.globalState.get<string>(
        FETCH_TRANSLATION_TOKEN_KEY
      );
      return token!;
    }

    // 토큰이 만료되었거나 없으면 새로 획득
    const newToken = await this.acquireNewToken();
    if (!newToken) {
      throw new Error("토큰을 획득할 수 없습니다. 인증을 다시 시도해주세요.");
    }

    return newToken;
  }

  /**
   * Microsoft Graph Client를 생성합니다.
   * 각 요청마다 토큰 유효성을 자동으로 체크합니다.
   * @returns 인증된 Microsoft Graph Client
   */
  createGraphClient(): Client {
    return Client.initWithMiddleware({
      authProvider: {
        getAccessToken: () => this.getAccessToken(),
      },
    });
  }

  /**
   * 저장된 토큰을 삭제합니다.
   */
  async clearToken(): Promise<void> {
    await this.context.globalState.update(
      FETCH_TRANSLATION_TOKEN_KEY,
      undefined
    );
    await this.context.globalState.update(
      FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
      undefined
    );
  }
}
