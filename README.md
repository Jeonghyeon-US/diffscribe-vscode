# DiffScribe – Universal AI Code Review Bridge

**VSCode Extension for Git Diff Export | AI Code Review Tool | ChatGPT Claude Gemini Compatible**

**One button. Any AI. Complete code review.**

Transform your Git commits and staged changes into AI-readable Markdown with a single click. Export git diff for AI code review with Claude, ChatGPT, GPT-4, Gemini, Grok, Copilot, and any LLM assistant – no MCP setup required.

**한 번의 클릭으로 모든 AI와 코드 리뷰를 시작하세요.**

Git 변경사항을 즉시 AI가 읽을 수 있는 마크다운으로 변환합니다. Claude, ChatGPT, Gemini, Grok 등 모든 AI 어시스턴트와 호환 – MCP 설정 불필요.

## 🔍 Keywords for Search
`git diff export` `ai code review` `chatgpt code review` `claude code review` `gemini code review` `vscode git extension` `markdown diff export` `ai pair programming` `code review automation` `git commit export` `staged changes export` `llm code review` `copilot alternative`

## 🎯 Why DiffScribe?

### The Problem
When AI assists with coding, getting another AI to review the changes is powerful but tedious. You need to manually copy git diffs, format them properly, and provide context for code review.

### The Solution  
DiffScribe bridges this gap with **one-click git diff export**:
- **Universal AI Compatibility**: Works with ChatGPT, Claude, Gemini, GPT-4, Grok, Copilot, and any LLM
- **No MCP Setup Required**: Unlike MCP tools, works instantly with all AI platforms
- **Mobile-Friendly**: Review code changes on your phone via any AI chat app
- **Smart Context Management**: Perfect with Repomix – provide initial codebase context, then use hunks mode for efficient incremental AI reviews
- **AI-Optimized Markdown**: Git diff format designed for maximum LLM comprehension

### 문제점
AI가 코딩을 도와줄 때, 다른 AI로 변경사항을 검토받는 것은 강력하지만 번거롭습니다. diff를 수동으로 복사하고, 형식을 맞추고, 컨텍스트를 제공해야 합니다.

### 해결책
DiffScribe는 **원클릭 내보내기**로 이 격차를 해결합니다:
- **범용 호환성**: 모든 AI 어시스턴트와 작동 (Claude, ChatGPT, Gemini, Grok 등)
- **설정 불필요**: MCP 도구와 달리 모든 플랫폼에서 즉시 작동
- **모바일 친화적**: 모든 AI 채팅 앱을 통해 휴대폰에서 코드 변경사항 검토 가능
- **스마트 컨텍스트**: Repomix 같은 도구와 완벽 호환 – 초기 코드베이스 컨텍스트 제공 후 hunks 모드로 효율적인 증분 리뷰
- **AI 최적화 형식**: AI 이해도를 극대화한 마크다운 출력

## 🚀 Key Features / 주요 기능

- **Export Commit Diffs**: Export selected commits as Markdown files
  - 선택한 커밋들을 마크다운으로 내보내기
- **Export Staged Changes**: Export currently staged changes as Markdown
  - 현재 스테이징된 변경사항을 마크다운으로 내보내기
- **Two Output Modes / 두 가지 출력 모드**:
  - **Full-context mode**: Shows complete file content with diff highlighting
    - 변경된 파일의 전체 내용을 diff와 함께 표시
  - **Hunks-only mode**: Shows only changed lines (+/-) to save space
    - 변경된 라인(+/-)과 hunk 헤더만 표시하여 용량 절약
- **File Metadata**: Includes file status, language detection, rename info
  - 파일 상태, 언어, 리네임 정보 등 포함
- **Binary File Handling**: Automatically detects and summarizes binary files
  - 바이너리 파일 자동 감지 및 요약
- **Bilingual Support**: English/Korean interface
  - 영어/한국어 인터페이스 지원

## 📥 Installation / 설치

### From VS Code Marketplace
1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "DiffScribe"
3. Click "Install"

### From VSIX file / VSIX 파일로 설치
```bash
code --install-extension diffscribe-0.1.0.vsix
```

## 🎯 Usage / 사용법

### Export Commit Diffs / 커밋 diff 내보내기
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "DiffScribe: Commit Diff: Export as Markdown"
3. Select commits to export (multi-select enabled)
4. Choose output mode (Full-context or Hunks-only)
5. Check the generated Markdown files

### Export Staged Changes / 스테이징된 변경사항 내보내기
1. Stage your files (`git add`)
2. Run "DiffScribe: Staged Diff: Export as Markdown"
3. Choose output mode
4. Check the generated Markdown file

### Quick Actions / 빠른 실행
Use the DiffScribe sidebar panel for quick access to:
- Export commits
- Export staged changes
- Change language settings

사이드바 패널에서 빠르게 액세스:
- 커밋 내보내기
- 스테이징된 변경사항 내보내기
- 언어 설정 변경

## ⚙️ Configuration / 설정

| Setting | Default | Description |
|---------|---------|-------------|
| `diffscribe.defaultMode` | `"hunks"` | Default export mode: `"full"` or `"hunks"`<br>기본 출력 모드 |
| `diffscribe.includeRenames` | `true` | Include rename detection in git diff<br>리네임 감지 포함 |
| `diffscribe.unifiedContext` | `3` | Number of context lines for git diff<br>컨텍스트 라인 수 |
| `diffscribe.singleFile` | `true` | Export all commits to a single file<br>모든 커밋을 하나의 파일로 |
| `diffscribe.outputDirectory` | `"diffscribe"` | Default output directory<br>기본 출력 디렉토리 |
| `diffscribe.maxFileBytes` | `2000000` | Max file size before truncation<br>최대 파일 크기 |
| `diffscribe.detectBinary` | `true` | Detect and summarize binary files<br>바이너리 파일 감지 |
| `diffscribe.language` | `"en"` | Display language: `"en"` or `"ko"`<br>표시 언어 |

## 📋 Output Format / 출력 형식

### Full-context Mode Example
```markdown
# Commit abc123 - Added new feature

## Files Changed

### src/feature.ts
```diff
@@ -10,5 +10,8 @@
 export function existingFunction() {
   console.log('existing');
 }
+
+export function newFeature() {
+  console.log('new feature');
+}
```

### Hunks-only Mode Example
Shows only the changed lines without full context, perfect for large files.
큰 파일에 적합하게 변경된 라인만 표시합니다.

## 🤝 Support & Contribution

### Future Features in Development
We're working on exciting new features for the next release:
- **Supervisor Mode**: AI-optimized summaries for code review supervision
- **MCP Integration**: Model Context Protocol support for advanced AI workflows  
- **Security Features**: Automatic API key and sensitive data removal
- **Advanced Analytics**: Code pattern detection and risk analysis

다음 릴리스를 위한 새로운 기능 개발 중:
- **Supervisor 모드**: AI 최적화된 코드 리뷰 요약
- **MCP 연동**: 고급 AI 워크플로우를 위한 Model Context Protocol 지원
- **보안 기능**: API 키 및 민감한 데이터 자동 제거
- **고급 분석**: 코드 패턴 감지 및 위험 분석

### Support Development
If you find DiffScribe helpful and would like to support the development of these advanced features, consider buying me a coffee! Your support helps maintain and improve this tool.

DiffScribe가 도움이 되셨다면, 고급 기능 개발을 위해 후원을 고려해주세요!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/jhai0)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🐛 Issues & Feedback

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/Jeonghyeon-US/diffscribe-vscode).

버그를 발견하거나 제안사항이 있으신가요? [GitHub](https://github.com/Jeonghyeon-US/diffscribe)에 이슈를 열어주세요.

## 🙏 Acknowledgments

Special thanks to all contributors and users who help improve DiffScribe!

DiffScribe를 개선하는데 도움을 주신 모든 기여자와 사용자분들께 감사드립니다!