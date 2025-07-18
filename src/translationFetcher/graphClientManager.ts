import * as vscode from "vscode";
import { PublicClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import {
  FETCH_TRANSLATION_TOKEN_EXPIRES_AT_KEY,
  FETCH_TRANSLATION_TOKEN_KEY,
  PcaConfig,
} from "./const";

export class GraphClientManager {
  private static clientInstance: Client | null = null;

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
    // 사용자에게 인증 과정에 대한 설명과 동의를 구함
    const detail = `다국어 파일에 접근하기 위해 Microsoft 계정 인증이 필요합니다.
      
      확인 버튼 클릭 시:
      • 인증 코드가 클립보드에 복사
      • 브라우저에서 인증 페이지가 열림
      • 복사된 코드를 붙여넣어 인증 완료
      인증을 진행하시겠습니까?
      `;
    const userConsent = await vscode.window.showInformationMessage(
      "인증 토큰이 없거나 만료됨",
      { modal: true, detail },
      "확인"
    );

    if (userConsent !== "확인") {
      vscode.window.showInformationMessage("인증이 취소되었습니다.");
      return null;
    }

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

      // 인증 성공 알림
      vscode.window.showInformationMessage(
        "Microsoft 계정 인증이 성공적으로 완료되었습니다!"
      );

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
      throw new Error("사용자가 인증을 취소했습니다.");
    }

    return newToken;
  }

  /**
   * Microsoft Graph Client를 생성하거나 기존 인스턴스를 반환합니다.
   * 싱글톤 패턴으로 관리되어 항상 같은 인스턴스를 재사용합니다.
   * @returns 인증된 Microsoft Graph Client
   */
  getGraphClient(): Client {
    if (!GraphClientManager.clientInstance) {
      GraphClientManager.clientInstance = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: () => this.getAccessToken(),
        },
      });
    }
    return GraphClientManager.clientInstance;
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

  /**
   * 클라이언트 인스턴스를 초기화합니다.
   * 주로 테스트나 완전한 재시작이 필요할 때 사용합니다.
   */
  static resetClientInstance(): void {
    GraphClientManager.clientInstance = null;
  }

  /**
   * Microsoft Graph API 호출을 래핑하여 토큰 만료 에러를 자동으로 처리합니다.
   * @param apiCall API 호출 함수
   * @returns API 응답 결과
   */
  async executeApiCall<T>(apiCall: (client: Client) => Promise<T>): Promise<T> {
    const client = this.getGraphClient();

    try {
      return await apiCall(client);
    } catch (error: any) {
      // 토큰 만료 에러인 경우 토큰을 클리어하고 재시도
      if (error.code === "InvalidAuthenticationToken") {
        await this.clearToken();
        // 클라이언트 인스턴스도 재생성
        GraphClientManager.resetClientInstance();

        // 새로운 클라이언트로 재시도
        const newClient = this.getGraphClient();
        return await apiCall(newClient);
      }

      // 다른 에러는 그대로 재던짐
      throw error;
    }
  }
}
