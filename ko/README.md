# DiffScribe – 범용 AI 코드 리뷰 브릿지

**Git Diff 내보내기 VSCode 확장 | AI 코드 리뷰 도구 | ChatGPT Claude Gemini 호환**

**버튼 하나. 모든 AI. 완벽한 코드 리뷰.**

Git 커밋과 스테이징된 변경사항을 한 번의 클릭으로 AI가 읽기 쉬운 마크다운으로 변환합니다. Claude, ChatGPT, GPT-4, Gemini, Grok, Copilot 등 모든 LLM 어시스턴트에서 git diff를 코드 리뷰용으로 내보내기 – MCP 설정 불필요.

---

**🇺🇸 For English version → [English README](../README.md)**

---

## 🎯 DiffScribe가 필요한 이유?

### 문제점
AI가 코딩을 도와줄 때, 다른 AI로 변경사항을 검토받는 것은 강력하지만 번거롭습니다. git diff를 수동으로 복사하고, 형식을 맞추고, 코드 리뷰를 위한 컨텍스트를 제공해야 합니다.

### 해결책
DiffScribe는 **원클릭 git diff 내보내기**로 이 격차를 해결합니다:
- **범용 AI 호환성**: ChatGPT, Claude, Gemini, GPT-4, Grok, Copilot 등 모든 LLM과 작동
- **MCP 설정 불필요**: MCP 도구와 달리 모든 AI 플랫폼에서 즉시 작동
- **모바일 친화적**: 모든 AI 채팅 앱을 통해 휴대폰에서 코드 변경사항 리뷰 가능
- **스마트 컨텍스트 관리**: Repomix와 완벽 호환 – 초기 코드베이스 컨텍스트 제공 후 hunks 모드로 효율적인 증분 AI 리뷰
- **AI 최적화 마크다운**: 최대 LLM 이해도를 위해 설계된 Git diff 형식

## 🚀 주요 기능

- **커밋 Diff 내보내기**: 선택한 커밋들을 마크다운 파일로 내보내기
- **스테이징된 변경사항 내보내기**: 현재 스테이징된 변경사항을 마크다운으로 내보내기
- **두 가지 출력 모드**:
  - **전체 컨텍스트 모드**: diff 하이라이팅과 함께 완전한 파일 내용 표시
  - **Hunks 전용 모드**: 공간 절약을 위해 변경된 라인(+/-)만 표시
- **파일 메타데이터**: 파일 상태, 언어 감지, 이름 변경 정보 포함
- **바이너리 파일 처리**: 바이너리 파일 자동 감지 및 요약
- **이중 언어 지원**: 영어/한국어 인터페이스

## 📥 설치

### VS Code 마켓플레이스에서
1. VS Code 확장 열기 (Ctrl+Shift+X)
2. "DiffScribe" 검색
3. "설치" 클릭

### VSIX 파일로 설치
```bash
code --install-extension diffscribe-0.1.1.vsix
```

## 🎯 사용법

### 커밋 Diff 내보내기
1. 명령 팔레트 열기 (Ctrl+Shift+P / Cmd+Shift+P)
2. "DiffScribe: Commit Diff: Export as Markdown" 실행
3. 내보낼 커밋 선택 (다중 선택 가능)
4. 출력 모드 선택 (전체 컨텍스트 또는 Hunks 전용)
5. 생성된 마크다운 파일 확인

### 스테이징된 변경사항 내보내기
1. 파일 스테이징 (`git add`)
2. "DiffScribe: Staged Diff: Export as Markdown" 실행
3. 출력 모드 선택
4. 생성된 마크다운 파일 확인

### 빠른 내보내기 명령
- **빠른 커밋 내보내기**: 기본 설정 사용
- **빠른 스테이징 내보내기**: 기본 설정 사용

## ⚙️ 설정

설정 접근: 파일 → 기본 설정 → 설정 → 확장 → DiffScribe

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `diffscribe.defaultMode` | `hunks` | 기본 내보내기 모드: `full` 또는 `hunks` |
| `diffscribe.singleFile` | `true` | 모든 커밋을 단일 파일로 내보내기 |
| `diffscribe.outputDirectory` | `diffscribe` | 출력 디렉토리 (워크스페이스 기준 상대 경로) |
| `diffscribe.maxFileBytes` | `2000000` | 잘라내기 전 최대 파일 크기 |
| `diffscribe.detectBinary` | `true` | 바이너리 파일 감지 및 요약 |
| `diffscribe.language` | `en` | 인터페이스 언어 (`en`/`ko`) |

## 💡 AI 코드 리뷰를 위한 완벽한 워크플로우

1. **초기 컨텍스트**: Repomix를 사용하여 AI에게 전체 코드베이스 컨텍스트 제공
2. **반복적 리뷰**: DiffScribe hunks 모드로 변경사항만 표시
3. **크로스 플랫폼**: 모든 기기에서 모든 AI 어시스턴트와 작동
4. **의존성 없음**: MCP 없음, 특별한 설정 없음 - 그냥 내보내고 붙여넣기

## 📋 출력 예시

### 전체 모드
```markdown
# 커밋: feat: 사용자 인증 추가

**작성자**: 홍길동 | **날짜**: 2024-01-22 10:30:00
**변경된 파일**: 3개 | **추가**: +45줄 | **삭제**: -12줄

## 파일: src/auth.js (수정됨)
**언어**: JavaScript | **크기**: 1.2KB

[diff 하이라이팅과 함께 완전한 파일 내용]
```

### Hunks 모드
```markdown
# 커밋: feat: 사용자 인증 추가

**변경사항**: 3개 파일에서 +45줄, -12줄

## src/auth.js
```diff
@@ -10,4 +10,8 @@
 function validateUser(email, password) {
+  if (!email || !password) {
+    throw new Error('이메일과 비밀번호가 필요합니다');
+  }
   return bcrypt.compare(password, hashedPassword);
 }
```

## 🛠️ 개발

이 프로젝트는 주로 개인 도구입니다. 현재 단계에서는 외부 기여를 기대하지 않습니다.

## ☕ 후원

DiffScribe가 AI 지원 개발 워크플로우에 도움이 되셨다면, 개발 지원을 고려해주세요!

[☕ Ko-fi에서 후원하기](https://ko-fi.com/jhai0)

## 📄 라이센스

MIT 라이센스 - 자세한 내용은 [LICENSE](../LICENSE) 파일을 참조하세요

## 🐛 이슈 및 피드백

버그를 발견하거나 제안사항이 있으신가요? [GitHub](https://github.com/Jeonghyeon-US/diffscribe-vscode)에 이슈를 열어주세요.

## 🙏 감사의 말

DiffScribe를 개선하는데 도움을 주신 모든 기여자와 사용자분들께 감사드립니다!