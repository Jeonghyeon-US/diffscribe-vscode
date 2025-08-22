/**
 * Markdown Renderer Module - Platform Independent
 * 
 * Handles all markdown rendering logic for DiffScribe.
 * No VSCode dependencies.
 */

import { CommitMeta, DiffFile, DiffHunk } from './types';
import { SecureGitCommands } from '../utils/secure-git';

export interface RenderOptions {
  maxFileBytes: number;
  detectBinary: boolean;
  cwd: string;
  language?: 'en' | 'ko';
}

export interface MarkdownMessages {
  noFilesChanged: string;
  filesChanged: string;
  binaryFileOmitted: string;
  noChangesInHunks: string;
  newFileWithLines: string;
  fileDeletedWithLines: string;
  changes: string;
}

const defaultMessages: { [key in 'en' | 'ko']: MarkdownMessages } = {
  en: {
    noFilesChanged: 'No files changed.',
    filesChanged: 'Files Changed',
    binaryFileOmitted: 'Binary file - content omitted',
    noChangesInHunks: 'No changes in hunks.',
    newFileWithLines: 'new file with {0} lines',
    fileDeletedWithLines: 'file deleted with {0} lines',
    changes: 'Changes: +{0} lines, -{1} lines'
  },
  ko: {
    noFilesChanged: '변경된 파일이 없습니다.',
    filesChanged: '변경된 파일',
    binaryFileOmitted: '바이너리 파일 - 내용 생략',
    noChangesInHunks: 'Hunk에 변경사항이 없습니다.',
    newFileWithLines: '{0}줄의 새 파일',
    fileDeletedWithLines: '{0}줄이 삭제된 파일',
    changes: '변경사항: +{0}줄, -{1}줄'
  }
};

export class MarkdownRenderer {
  private secureGit: SecureGitCommands;
  private messages: MarkdownMessages;

  constructor(language: 'en' | 'ko' = 'en') {
    this.secureGit = new SecureGitCommands();
    this.messages = defaultMessages[language];
  }

  /**
   * Main render function
   */
  async render(
    meta: CommitMeta,
    files: DiffFile[],
    mode: 'full' | 'hunks' | 'supervisor',
    options: RenderOptions
  ): Promise<string> {
    // Supervisor mode delegates to specialized renderer
    if (mode === 'supervisor') {
      return await this.renderSupervisorSummary(meta, files, options);
    }

    const lines: string[] = [];
    
    // Header
    lines.push(`# ${meta.hash ? `Commit ${this.getShortHash(meta.hash)} - ` : ''}${this.getTitle(meta.message)}`);
    
    // Metadata
    if (meta.author || meta.date) {
      lines.push('');
      if (meta.author) {lines.push(`- **Author**: ${meta.author}`);}
      if (meta.date) {lines.push(`- **Date**: ${meta.date}`);}
      if (meta.hash) {lines.push(`- **Hash**: ${meta.hash}`);}
    }

    // Check for empty changeset
    if (files.length === 0) {
      lines.push('', this.messages.noFilesChanged);
      return lines.join('\n');
    }

    lines.push('', `## ${this.messages.filesChanged}`);
    
    // Render each file
    for (const file of files) {
      await this.renderFile(file, mode, lines, meta, options);
    }

    return lines.join('\n');
  }

  /**
   * Render a single file's changes
   */
  private async renderFile(
    file: DiffFile,
    mode: 'full' | 'hunks',
    lines: string[],
    meta: CommitMeta,
    options: RenderOptions
  ): Promise<void> {
    const filePath = file.newPath || file.oldPath;
    
    lines.push('', `### ${filePath}`);
    lines.push(`- **Status**: ${file.status}`);
    
    // Handle renames
    if (file.renameFrom && file.renameTo) {
      lines.push(`- **Rename**: ${file.renameFrom} → ${file.renameTo}`);
    }
    
    // Language detection
    const ext = filePath.split('.').pop()?.toLowerCase();
    const language = this.getLanguageFromExtension(ext);
    if (language) {
      lines.push(`- **Language**: ${language}`);
    }

    // Binary file handling
    if (file.isBinary && options.detectBinary && !this.isLikelyTextFile(filePath)) {
      lines.push('', `**${this.messages.binaryFileOmitted}**`);
      return;
    }

    // Check for empty hunks
    if (file.hunks.length === 0 && file.status !== 'deleted' && file.status !== 'added') {
      lines.push('', this.messages.noChangesInHunks);
      return;
    }

    lines.push('');
    
    if (mode === 'full') {
      await this.renderFullMode(file, lines, meta, options);
    } else {
      await this.renderHunksMode(file, lines);
    }
  }

  /**
   * Render file in full mode (with context)
   */
  private async renderFullMode(
    file: DiffFile,
    lines: string[],
    meta: CommitMeta,
    options: RenderOptions
  ): Promise<void> {
    try {
      let fullContent: string;
      
      if (meta.hash) {
        // For commits
        fullContent = await this.getFullFileContent(
          options.cwd,
          meta.hash,
          file.newPath || file.oldPath,
          file.hunks,
          options.maxFileBytes,
          file.status
        );
      } else {
        // For staged changes
        fullContent = await this.getFullFileContentForStaged(
          options.cwd,
          file.newPath || file.oldPath,
          file.hunks,
          file.status,
          file.renameFrom,
          options.maxFileBytes
        );
      }
      
      lines.push('```diff');
      lines.push(fullContent);
      lines.push('```');
    } catch (e) {
      // Fallback to body content
      lines.push('```diff');
      
      // Use MemoryManager for safe content processing
      const content = file.body || '';
      
      if (content.length > options.maxFileBytes) {
        lines.push(content.substring(0, options.maxFileBytes));
        lines.push(`\n... (truncated)`);
      } else {
        lines.push(content);
      }
      lines.push('```');
    }
  }

  /**
   * Render file in hunks-only mode
   */
  private async renderHunksMode(file: DiffFile, lines: string[]): Promise<void> {
    if (file.status === 'added') {
      // For added files, show summary
      const totalLines = (file.body || '').split('\n').filter(line => line.startsWith('+')).length;
      lines.push('```diff');
      lines.push('@@ -0,0 +1,' + totalLines + ' @@');
      lines.push(`... (${this.formatMessage(this.messages.newFileWithLines, totalLines.toString())})`);
      lines.push('```');
      lines.push(`*${this.formatMessage(this.messages.changes, totalLines.toString(), '0')}*`);
    } else if (file.status === 'deleted') {
      // For deleted files, show summary
      const totalLines = (file.body || '').split('\n').filter(line => line.startsWith('-')).length;
      lines.push('```diff');
      lines.push('@@ -1,' + totalLines + ' +0,0 @@');
      lines.push(`... (${this.formatMessage(this.messages.fileDeletedWithLines, totalLines.toString())})`);
      lines.push('```');
      lines.push(`*${this.formatMessage(this.messages.changes, '0', totalLines.toString())}*`);
    } else {
      // For modified/renamed files, show only changed lines
      lines.push('```diff');
      let addedLines = 0;
      let removedLines = 0;
      
      for (const hunk of file.hunks) {
        lines.push(hunk.header || '');
        for (const line of hunk.lines) {
          if (line.startsWith('+')) {
            lines.push(line);
            addedLines++;
          } else if (line.startsWith('-')) {
            lines.push(line);
            removedLines++;
          }
        }
      }
      
      lines.push('```');
      
      // Add summary
      if (addedLines > 0 || removedLines > 0) {
        lines.push(`*${this.formatMessage(this.messages.changes, addedLines.toString(), removedLines.toString())}*`);
      }
    }
  }

  /**
   * Render supervisor summary (optimized for AI review)
   */
  async renderSupervisorSummary(meta: CommitMeta, files: DiffFile[], options: RenderOptions): Promise<string> {
    const stats = await this.getCommitStats(options.cwd, meta.hash, files);
    
    const lines: string[] = [];
    
    // Compact header
    lines.push(`# ${this.getShortHash(meta.hash)} - ${this.getTitle(meta.message)}`);
    lines.push(`Author: ${meta.author} | Date: ${meta.date}`);
    lines.push('');
    
    // Statistics overview
    lines.push('## Summary');
    lines.push(`- Files: ${stats.filesChanged}`);
    lines.push(`- Lines: +${stats.additions} -${stats.deletions}`);
    
    // Risk indicators
    if (stats.riskIndicators.length > 0) {
      lines.push('');
      lines.push('## Risk Indicators');
      stats.riskIndicators.forEach((risk: string) => {
        lines.push(`- ${risk}`);
      });
    }
    
    // Key changes by file
    lines.push('');
    lines.push('## Key Changes');
    
    for (const file of files) {
      if (file.hunks.length === 0 && file.status !== 'added' && file.status !== 'deleted') {
        continue;
      }
      
      const filePath = file.newPath || file.oldPath;
      const hunksCount = file.hunks.length;
      const additions = file.hunks.reduce((sum, h) => 
        sum + h.lines.filter(l => l.startsWith('+')).length, 0);
      const deletions = file.hunks.reduce((sum, h) => 
        sum + h.lines.filter(l => l.startsWith('-')).length, 0);
      
      lines.push(`- **${filePath}** (${file.status}): +${additions} -${deletions} in ${hunksCount} hunks`);
      
      // Sample important changes
      const importantChanges = this.extractImportantChanges(file);
      if (importantChanges.length > 0) {
        importantChanges.slice(0, 3).forEach(change => {
          lines.push(`  - ${change}`);
        });
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Get full file content with changes highlighted
   */
  private async getFullFileContent(
    cwd: string,
    commitHash: string,
    filePath: string,
    hunks: DiffHunk[],
    maxFileBytes: number,
    status: string
  ): Promise<string> {
    if (status === 'added') {
      // For new files, get content from the commit
      const result = await this.secureGit.safeGitCommand(
        ['show', `${commitHash}:${filePath}`],
        cwd,
        maxFileBytes
      );
      
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        return lines.map(line => `+${line}`).join('\n');
      }
      return '// New file - content not available';
    }
    
    if (status === 'deleted') {
      // For deleted files, get content from parent commit
      const result = await this.secureGit.safeGitCommand(
        ['show', `${commitHash}^:${filePath}`],
        cwd,
        maxFileBytes
      );
      
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        return lines.map(line => `-${line}`).join('\n');
      }
      return '// Deleted file - content not available';
    }
    
    // For modified files, get the new version and mark changes
    const result = await this.secureGit.safeGitCommand(
      ['show', `${commitHash}:${filePath}`],
      cwd,
      maxFileBytes
    );
    
    if (!result.stdout) {
      return '// File content not available';
    }
    
    const lines = result.stdout.split('\n');
    const markedLines: string[] = [];
    
    // Build a map of changed line numbers
    const changedLines = new Set<number>();
    hunks.forEach(hunk => {
      for (let i = 0; i < hunk.newLines; i++) {
        changedLines.add(hunk.newStart + i);
      }
    });
    
    // Mark changed lines
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (changedLines.has(lineNumber)) {
        markedLines.push(`!${line}`);
      } else {
        markedLines.push(` ${line}`);
      }
    });
    
    return markedLines.join('\n');
  }

  /**
   * Get full file content for staged changes
   */
  private async getFullFileContentForStaged(
    cwd: string,
    filePath: string,
    hunks: DiffHunk[],
    status: string,
    renameFrom?: string,
    maxFileBytes?: number
  ): Promise<string> {
    if (status === 'added') {
      // For new files in staging, show from working directory
      const result = await this.secureGit.safeGitCommand(
        ['show', `:${filePath}`],
        cwd,
        maxFileBytes
      );
      
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        return lines.map(line => `+${line}`).join('\n');
      }
      return '// New file - staged content';
    }
    
    if (status === 'deleted') {
      // For deleted files, show from HEAD
      const result = await this.secureGit.safeGitCommand(
        ['show', `HEAD:${filePath}`],
        cwd,
        maxFileBytes
      );
      
      if (result.stdout) {
        const lines = result.stdout.split('\n');
        return lines.map(line => `-${line}`).join('\n');
      }
      return '// Deleted file - staged for removal';
    }
    
    // For modified files, show staged version
    const result = await this.secureGit.safeGitCommand(
      ['show', `:${filePath}`],
      cwd,
      maxFileBytes
    );
    
    if (!result.stdout) {
      return '// Staged file content not available';
    }
    
    const lines = result.stdout.split('\n');
    const markedLines: string[] = [];
    
    // Build a map of changed line numbers
    const changedLines = new Set<number>();
    hunks.forEach(hunk => {
      for (let i = 0; i < hunk.newLines; i++) {
        changedLines.add(hunk.newStart + i);
      }
    });
    
    // Mark changed lines
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (changedLines.has(lineNumber)) {
        markedLines.push(`!${line}`);
      } else {
        markedLines.push(` ${line}`);
      }
    });
    
    return markedLines.join('\n');
  }

  /**
   * Get commit statistics
   */
  private async getCommitStats(cwd: string, hash: string, files: DiffFile[]): Promise<any> {
    const additions = files.reduce((sum, f) => 
      sum + f.hunks.reduce((s, h) => 
        s + h.lines.filter(l => l.startsWith('+')).length, 0), 0);
    
    const deletions = files.reduce((sum, f) => 
      sum + f.hunks.reduce((s, h) => 
        s + h.lines.filter(l => l.startsWith('-')).length, 0), 0);
    
    const riskIndicators: string[] = [];
    
    // Check for security patterns
    for (const file of files) {
      const filePath = file.newPath || file.oldPath;
      
      // Check for sensitive files
      if (filePath.includes('.env') || filePath.includes('secret') || filePath.includes('key')) {
        riskIndicators.push(`Sensitive file modified: ${filePath}`);
      }
      
      // Check for large changes
      const fileAdditions = file.hunks.reduce((s, h) => 
        s + h.lines.filter(l => l.startsWith('+')).length, 0);
      if (fileAdditions > 500) {
        riskIndicators.push(`Large change in ${filePath}: +${fileAdditions} lines`);
      }
    }
    
    return {
      filesChanged: files.length,
      additions,
      deletions,
      riskIndicators
    };
  }

  /**
   * Extract important changes from a file
   */
  private extractImportantChanges(file: DiffFile): string[] {
    const changes: string[] = [];
    
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        // Look for function/method definitions
        if (line.match(/^\+.*function\s+\w+|^\+.*def\s+\w+|^\+.*class\s+\w+/)) {
          changes.push(line.substring(1).trim());
        }
        // Look for imports
        else if (line.match(/^\+.*import\s+|^\+.*from\s+.*import/)) {
          changes.push(line.substring(1).trim());
        }
        // Look for API endpoints
        else if (line.match(/^\+.*@(Get|Post|Put|Delete|Patch)\(|^\+.*\.(get|post|put|delete|patch)\(/i)) {
          changes.push(line.substring(1).trim());
        }
      }
    }
    
    return changes;
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext?: string): string {
    if (!ext) {return '';}
    
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sh': 'bash',
      'bash': 'bash',
      'sql': 'sql'
    };
    
    return langMap[ext] || ext;
  }

  /**
   * Check if file is likely a text file
   */
  private isLikelyTextFile(path: string): boolean {
    const textExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'txt', 'html', 'css', 'scss', 'sass',
      'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'kt',
      'swift', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'xml', 'yml', 'yaml', 'toml',
      'ini', 'conf', 'config', 'env', 'gitignore', 'dockerignore', 'editorconfig',
      'vue', 'svelte', 'astro', 'sql', 'graphql', 'gql', 'prisma', 'proto',
      'dockerfile', 'makefile', 'rakefile', 'gemfile', 'podfile', 'gradle'
    ];
    
    const ext = path.split('.').pop()?.toLowerCase();
    const fileName = path.split('/').pop()?.toLowerCase();
    
    // Check by extension
    if (ext && textExtensions.includes(ext)) {
      return true;
    }
    
    // Check by filename patterns
    if (fileName) {
      const textFilePatterns = [
        /^dockerfile/i,
        /^makefile/i,
        /^rakefile/i,
        /^gemfile/i,
        /^podfile/i,
        /^readme/i,
        /^license/i,
        /^changelog/i,
        /^contributing/i,
        /^authors/i,
        /^todo/i,
        /^\..*rc$/i,
        /^\..*config$/i
      ];
      
      if (textFilePatterns.some(pattern => pattern.test(fileName))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Format message with placeholders
   */
  private formatMessage(template: string, ...args: string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index) => {
      return args[parseInt(index)] || match;
    });
  }

  /**
   * Get short hash from full hash
   */
  private getShortHash(hash: string): string {
    return hash.substring(0, 7);
  }

  /**
   * Get title from commit message
   */
  private getTitle(message: string): string {
    return message.split('\n')[0];
  }
}

export default MarkdownRenderer;