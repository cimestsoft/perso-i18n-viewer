# 사용 방법

기능은 기본적으로 비활성화되어 있으며, 커맨드 팔레트(Cmd+Shift+P) 또는 좌측의 Activity Bar(탐색기, 검색, Git, 확장 등이 있는 곳)를 통해 사용 가능

사용 가능한 명령어는 총 3가지

1. 다국어(i18n): 변환 텍스트 표시 토글
2. 다국어(i18n): 언어 선택
3. 다국어(i18n): 번역 새로고침

# Extension 설정(선택)

.vscode/persoi18nviewer.json 파일을 생성해서 아래의 형식으로 파일 작성

```json
{
  "localesPath": "apps/portal/messages/${locale}.json",
  "locales": ["en", "ko"],
  "defaultLocale": "en"
}
```

- localesPath는 다국어 번역 파일이 위치한 경로, ${locale} 부분을 locales의 원소들로 하나씩 치환하면서 불러옴
- locales는 언어 목록
- defaultLocale는 기본적으로 선택할 언어

위의 json 파일이 기본적으로 extension 내에 세팅되어 있으니, 기본값을 사용하신다면 굳이 파일을 추가할 필요는 없습니다.

기본적으로 표시될 언어를 한국어로 변경하고 싶다면 파일을 추가해서 defaultLocale를 "ko"로 변경하세요!

## 스튜디오 설정 파일 예시

```json
{
  "localesPath": "src/locales/${locale}/translation.json",
  "locales": ["en", "ko"],
  "defaultLocale": "ko"
}
```

# 프로젝트 vsix 파일로 빌드하기

```
vsce package
```

## vsce 미설치 시

```
npm install -g @vscode/vsce
```
