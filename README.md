# DiffScribe – Universal AI Code Review Bridge

**VSCode Extension for Git Diff Export | AI Code Review Tool | ChatGPT Claude Gemini Compatible**

**One button. Any AI. Complete code review.**

Transform your Git commits and staged changes into AI-readable Markdown with a single click. Export git diff for AI code review with Claude, ChatGPT, GPT-4, Gemini, Grok, Copilot, and any LLM assistant – no MCP setup required.

---

**🇰🇷 For Korean version → [한국어 README 보기](./ko/README.md)**

---

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

## 🚀 Key Features

- **Export Commit Diffs**: Export selected commits as Markdown files
- **Export Staged Changes**: Export currently staged changes as Markdown
- **Two Output Modes**:
  - **Full-context mode**: Shows complete file content with diff highlighting
  - **Hunks-only mode**: Shows only changed lines (+/-) to save space
- **File Metadata**: Includes file status, language detection, rename info
- **Binary File Handling**: Automatically detects and summarizes binary files
- **Bilingual Support**: English/Korean interface

## 📥 Installation

### From VS Code Marketplace
1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "DiffScribe"
3. Click "Install"

### From VSIX file
```bash
code --install-extension diffscribe-0.1.0.vsix
```

## 🎯 Usage

### Export Commit Diffs
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "DiffScribe: Commit Diff: Export as Markdown"
3. Select commits to export (multi-select enabled)
4. Choose output mode (Full-context or Hunks-only)
5. Check the generated Markdown files

### Export Staged Changes
1. Stage your files (`git add`)
2. Run "DiffScribe: Staged Diff: Export as Markdown"
3. Choose output mode
4. Check the generated Markdown file

### Quick Export Commands
- **Quick Commit Export**: Uses your default settings
- **Quick Staged Export**: Uses your default settings

## ⚙️ Configuration

Access settings via: File → Preferences → Settings → Extensions → DiffScribe

| Setting | Default | Description |
|---------|---------|-------------|
| `diffscribe.defaultMode` | `hunks` | Default export mode: `full` or `hunks` |
| `diffscribe.singleFile` | `true` | Export all commits to single file |
| `diffscribe.outputDirectory` | `diffscribe` | Output directory (relative to workspace) |
| `diffscribe.maxFileBytes` | `2000000` | Max file size before truncation |
| `diffscribe.detectBinary` | `true` | Detect and summarize binary files |
| `diffscribe.language` | `en` | Interface language (`en`/`ko`) |

## 💡 Perfect Workflow for AI Code Review

1. **Initial Context**: Use Repomix to provide full codebase context to AI
2. **Iterative Review**: Use DiffScribe hunks mode to show only changes
3. **Cross-Platform**: Works with any AI assistant on any device
4. **No Dependencies**: No MCP, no special setup - just export and paste

## 📋 Example Output

### Full Mode
```markdown
# Commit: feat: add user authentication

**Author**: John Doe | **Date**: 2024-01-22 10:30:00
**Files changed**: 3 | **Insertions**: +45 | **Deletions**: -12

## File: src/auth.js (Modified)
**Language**: JavaScript | **Size**: 1.2KB

[Complete file content with diff highlighting]
```

### Hunks Mode
```markdown
# Commit: feat: add user authentication

**Changes**: +45, -12 lines across 3 files

## src/auth.js
```diff
@@ -10,4 +10,8 @@
 function validateUser(email, password) {
+  if (!email || !password) {
+    throw new Error('Email and password required');
+  }
   return bcrypt.compare(password, hashedPassword);
 }
```

## 🛠️ Development

This project is primarily a personal tool. External contributions are not expected at this stage.

## ☕ Support

If you find DiffScribe helpful for your AI-assisted development workflow, consider supporting its development!

[☕ Support on Ko-fi](https://ko-fi.com/jhai0)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🐛 Issues & Feedback

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/Jeonghyeon-US/diffscribe-vscode).

## 🙏 Acknowledgments

Special thanks to all contributors and users who help improve DiffScribe!