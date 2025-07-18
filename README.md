# 사용 방법

기능은 기본적으로 비활성화되어 있으며, 커맨드 팔레트(Cmd+Shift+P) 또는 좌측의 Activity Bar(탐색기, 검색, Git, 확장 등이 있는 곳)를 통해 사용 가능

사용 가능한 명령어는 총 3가지

1. 다국어(i18n): 변환 텍스트 표시 토글
2. 다국어(i18n): 언어 선택
3. 다국어(i18n): 번역 새로고침
4. 다국어(i18n): 번역 가져오기

# Extension 설정(삭제됨)

기존에 사용했던 .vscode/persoi18nviewer.json은 더 이상 사용되지 않음
자동으로 package.json의 "name" 필드를 통해 포탈과 스튜디오를 감지

# 프로젝트 vsix 파일로 빌드하기

```
npm run build
```
