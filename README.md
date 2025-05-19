# 사용 방법

기능은 기본적으로 비활성화되어 있으며, 커맨드 팔레트(Cmd+Shift+P)를 통해 활성화 가능

사용 가능한 명령어는 총 3가지

1. 다국어(i18n): 변환 텍스트 표시 토글
2. 다국어(i18n): 언어 선택
3. 다국어(i18n): 번역 새로고침

# Extension 설정(선택)

.vscode/persoi18nviewer.json 파일을 생성해서 아래의 형식으로 파일 작성

```json
{
  "localesPath": "apps/portal/messages",
  "defaultLanguage": "ko"
}
```

- localesPath는 다국어 번역 파일이 위치한 경로
- defaultLanguage는 기본적으로 선택할 언어

위의 json 파일이 기본적으로 extension 내에 세팅되어 있으므로 defaultLanguage를 변경할 게 아니면 굳이 할 필요는 없습니다.
