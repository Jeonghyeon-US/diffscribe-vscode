/*
 * DiffScribe - Proprietary Software
 * Copyright (c) 2025 DiffScribe. All rights reserved.
 * 
 * This source code is confidential and proprietary to DiffScribe.
 * Any unauthorized copying, modification, distribution, or use is strictly prohibited.
 */

import * as vscode from 'vscode';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sh = promisify(exec);

// Internationalization
interface Messages {
  [key: string]: { en: string; ko: string };
}

const messages: Messages = {
  noWorkspaceFolder: {
    en: 'Please open a folder with a Git repository first.',
    ko: 'Git 저장소가 있는 폴더를 먼저 열어주세요.'
  },
  configureLanguage: {
    en: 'Configure Language',
    ko: '언어 설정'
  },
  selectLanguage: {
    en: 'Select display language',
    ko: '표시 언어 선택'
  },
  notGitRepo: {
    en: 'Not a Git repository. Please use in a Git-initialized project.',
    ko: 'Git 저장소가 아닙니다. Git이 초기화된 프로젝트에서 사용해주세요.'
  },
  cannotGetCommitList: {
    en: 'Cannot get commit list: {0}',
    ko: '커밋 목록을 가져올 수 없습니다: {0}'
  },
  cannotGetCommitInfo: {
    en: 'Cannot get commit information: {0}',
    ko: '커밋 정보를 가져올 수 없습니다: {0}'
  },
  noChangedFiles: {
    en: 'No changed files.',
    ko: '변경된 파일이 없습니다.'
  },
  noStagedChanges: {
    en: 'No staged changes.',
    ko: '스테이징된 변경사항이 없습니다.'
  },
  askToStageAll: {
    en: 'No staged changes found.\nWould you like to stage all changes and export them?',
    ko: '스테이징된 변경사항이 없습니다.\n모든 변경사항을 스테이징하고 내보내시겠습니까?'
  },
  allChangesStaged: {
    en: 'All changes have been staged.',
    ko: '모든 변경사항이 스테이징되었습니다.'
  },
  stagingError: {
    en: 'Error occurred while staging: {0}',
    ko: '스테이징 중 오류가 발생했습니다: {0}'
  },
  errorOccurred: {
    en: 'An error occurred: {0}',
    ko: '오류가 발생했습니다: {0}'
  },
  fullContextMode: {
    en: 'Full-context (Default)',
    ko: 'Full-context (기본값)'
  },
  hunksOnlyMode: {
    en: 'Hunks-only (Save Space)',
    ko: 'Hunks-only (용량 절약)'
  },
  fullContextDesc: {
    en: 'Show full file content with diff highlighting',
    ko: '변경된 파일의 전체 내용을 diff와 함께 표시'
  },
  hunksOnlyDesc: {
    en: 'Show only changed lines (+/-) and hunk headers',
    ko: '변경된 라인(+/-)과 hunk 헤더만 표시'
  },
  selectOutputMode: {
    en: 'Select output mode (Default: {0})',
    ko: '출력 모드 선택 (기본값: {0})'
  },
  selectCommitsToExport: {
    en: 'Select commits to export (Multi-select enabled)',
    ko: '내보낼 커밋을 선택하세요 (다중 선택 가능)'
  },
  processing: {
    en: 'Processing {0}/{1}: {2}',
    ko: '{0}/{1} 처리 중: {2}'
  },
  completed: {
    en: 'Completed',
    ko: '완료'
  },
  exportedFiles: {
    en: '{0} Markdown files have been exported.',
    ko: '{0}개의 마크다운 파일이 내보내졌습니다.'
  },
  exportedFilesToDir: {
    en: '{0} Markdown files have been saved to {1}.',
    ko: '{0}개의 마크다운 파일이 {1}에 저장되었습니다.'
  },
  openFolder: {
    en: 'Open Folder',
    ko: '폴더 열기'
  },
  openFile: {
    en: 'Open File',
    ko: '파일 열기'
  },
  noChangesToExport: {
    en: 'No changes to export.',
    ko: '내보낼 변경사항이 없습니다.'
  },
  yes: {
    en: 'Yes',
    ko: '예'
  },
  cancel: {
    en: 'Cancel',
    ko: '취소'
  },
  exportCommits: {
    en: '📝 Export Commits',
    ko: '📝 커밋 내보내기'
  },
  exportCommitsDesc: {
    en: 'Export selected commits as Markdown',
    ko: '선택한 커밋을 마크다운으로 내보내기'
  },
  exportStaged: {
    en: '🎯 Export Staged Changes',
    ko: '🎯 스테이징된 변경사항 내보내기'
  },
  exportStagedDesc: {
    en: 'Export currently staged changes as Markdown',
    ko: '현재 스테이징된 변경사항을 마크다운으로 내보내기'
  },
  settings: {
    en: '⚙️ Settings',
    ko: '⚙️ 설정'
  },
  settingsDesc: {
    en: 'Configure DiffScribe settings',
    ko: 'DiffScribe 설정 구성'
  },
  stagedChangesDesc: {
    en: 'Current staged changes',
    ko: '현재 스테이징된 변경사항'
  },
  noFilesChanged: {
    en: 'No files changed.',
    ko: '변경된 파일이 없습니다.'
  }
};

function t(key: string, ...args: string[]): string {
  const cfg = vscode.workspace.getConfiguration('diffscribe');
  const lang = cfg.get<'en'|'ko'>('language', 'en');
  
  const message = messages[key]?.[lang] || messages[key]?.['en'] || key;
  
  // Simple string interpolation for {0}, {1}, etc.
  return message.replace(/\{(\d+)\}/g, (match, index) => {
    return args[parseInt(index)] || match;
  });
}

interface CommitMeta {
  title: string;
  author: string;
  date: string;
  hash: string;
  short: string;
}

interface DiffFile {
  header: string;
  body: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  pathA: string;
  pathB: string;
  isBinary: boolean;
  hunks: DiffHunk[];
  renameFrom?: string;
  renameTo?: string;
}

interface DiffHunk {
  header: string;
  lines: string[];
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('DiffScribe extension is now active!');
  
  try {
    // Create the sidebar panel provider
    const diffScribeProvider = new DiffScribeProvider(context);
    
    // Register the tree data provider for the sidebar
    const treeView = vscode.window.createTreeView('diffscribe.panel', {
      treeDataProvider: diffScribeProvider,
      showCollapseAll: true
    });

    console.log('TreeView created successfully');

    // Set context to enable the view
    vscode.commands.executeCommand('setContext', 'diffscribe:enabled', true);

    // Register all commands
    const commands = [
      vscode.commands.registerCommand('diffscribe.exportCommits', () => runExport({ type: 'commits' })),
      vscode.commands.registerCommand('diffscribe.exportStaged', () => runExport({ type: 'staged' })),
      vscode.commands.registerCommand('diffscribe.quickExportCommits', () => quickExportCommits()),
      vscode.commands.registerCommand('diffscribe.quickExportStaged', () => quickExportStaged()),
      vscode.commands.registerCommand('diffscribe.selectLanguage', () => selectLanguage()),
      vscode.commands.registerCommand('diffscribe.refresh', () => diffScribeProvider.refresh())
    ];

    console.log(`Registered ${commands.length} commands`);

    context.subscriptions.push(treeView, ...commands);

    console.log('All subscriptions added successfully');
  } catch (error) {
    console.error('Error setting up UI components:', error);
    vscode.window.showErrorMessage(`DiffScribe UI setup failed: ${error}`);
  }
}

class DiffScribeProvider implements vscode.TreeDataProvider<DiffScribeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiffScribeItem | undefined | null | void> = new vscode.EventEmitter<DiffScribeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DiffScribeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {
    console.log('DiffScribeProvider initialized');
  }

  refresh(): void {
    console.log('TreeView refresh requested');
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DiffScribeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DiffScribeItem): Promise<DiffScribeItem[]> {
    console.log('getChildren called, element:', element?.label);
    
    if (!element) {
      // Check if we're in a Git repository
      const workspace = vscode.workspace.workspaceFolders?.[0];
      if (!workspace) {
        console.log('No workspace found');
        return [
          new DiffScribeItem(
            'No workspace opened',
            'Please open a folder to use DiffScribe',
            vscode.TreeItemCollapsibleState.None
          )
        ];
      }

      try {
        // Quick check if this is a Git repository
        await sh('git rev-parse --git-dir', { cwd: workspace.uri.fsPath });
        console.log('Git repository confirmed');
        
        const items = [
          new DiffScribeItem(
            t('exportCommits'),
            t('exportCommitsDesc'),
            vscode.TreeItemCollapsibleState.None,
            'diffscribe.quickExportCommits'
          ),
          new DiffScribeItem(
            t('exportStaged'),
            t('exportStagedDesc'),
            vscode.TreeItemCollapsibleState.None,
            'diffscribe.quickExportStaged'
          ),
          new DiffScribeItem(
            t('configureLanguage'),
            t('selectLanguage'),
            vscode.TreeItemCollapsibleState.None,
            'diffscribe.selectLanguage'
          )
        ];
        
        console.log(`Returning ${items.length} tree items`);
        return items;
      } catch (error) {
        console.log('Not a Git repository:', error);
        return [
          new DiffScribeItem(
            'Not a Git repository',
            'DiffScribe requires a Git repository to function',
            vscode.TreeItemCollapsibleState.None
          )
        ];
      }
    }
    return [];
  }
}

class DiffScribeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    commandId?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.description = tooltip;
    
    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
        arguments: []
      };
    }
    
    // Add context value for better identification
    this.contextValue = 'diffScribeItem';
    
    // Add icons for better visual feedback
    if (commandId === 'diffscribe.quickExportCommits') {
      this.iconPath = new vscode.ThemeIcon('git-commit');
    } else if (commandId === 'diffscribe.quickExportStaged') {
      this.iconPath = new vscode.ThemeIcon('git-merge');
    } else if (commandId === 'diffscribe.selectLanguage') {
      this.iconPath = new vscode.ThemeIcon('globe');
    }
  }
}

async function runExport(opts: { type: 'commits' | 'staged' }) {
  const startTime = Date.now();
  try {
    const cfg = vscode.workspace.getConfiguration('diffscribe');
    const modeDefault = cfg.get<'full'|'hunks'>('defaultMode', 'hunks');
    const unified = cfg.get<number>('unifiedContext', 3);
    const includeRenames = cfg.get<boolean>('includeRenames', true);
    const singleFile = cfg.get<boolean>('singleFile', true);
    const outDirCfg = cfg.get<string>('outputDirectory', 'diffscribe');
    const detectBinary = cfg.get<boolean>('detectBinary', true);
    
    const maxFileBytes = cfg.get<number>('maxFileBytes', 2000000);

    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      return vscode.window.showErrorMessage(t('noWorkspaceFolder'));
    }
    const cwd = ws.uri.fsPath;

    await checkGitRepo(cwd);

    // Use diffscribe folder in workspace root as default
    const defaultOutDir = join(cwd, outDirCfg);
    const outDir = defaultOutDir;
    await mkdir(outDir, { recursive: true });

    const mode = await pickMode(modeDefault);
    if (!mode) {return;}

    const targets = opts.type === 'commits'
      ? await pickCommits(cwd)
      : await getStagedTargets(cwd);

    if (!targets || targets.length === 0) {return;}

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "DiffScribe",
      cancellable: false
    }, async (progress) => {
      const files: string[] = [];
      const renameOpt = includeRenames ? '--find-renames' : '';
      
      let allContent = '';
      const total = targets.length;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const seq = String(i + 1).padStart(4, '0');
        
        progress.report({ 
          increment: 100 / total, 
          message: t('processing', String(i + 1), String(total), target.label) 
        });

        const meta = opts.type === 'commits'
          ? await getCommitMeta(cwd, target.detail)
          : { title: 'Staged Changes', author: '', date: new Date().toISOString(), hash: '', short: 'staged' };

        const diffCmd = opts.type === 'commits'
          ? `git show ${target.detail} --pretty=format: --unified=${unified} ${renameOpt} --diff-filter=ACMRTUXB`
          : `git diff --cached --unified=${unified} ${renameOpt} --diff-filter=ACMRTUXB`;
        const { stdout: diff } = await sh(diffCmd, { cwd, maxBuffer: 50 * 1024 * 1024 });

        if (!diff.trim()) {
          continue;
        }

        const blocks = splitByFile(diff);
        const rendered = await renderMarkdown(meta, blocks, mode, { 
          maxFileBytes, 
          detectBinary, 
          cwd 
        });

        if (singleFile && opts.type === 'commits') {
          allContent += rendered + '\n\n---\n\n';
        } else {
          const name = opts.type === 'commits' 
            ? `diff-${seq}-${meta.short}.md` 
            : `diff-staged-${Date.now()}.md`;
          const file = join(outDir, name);
          await writeFile(file, rendered, 'utf8');
          files.push(file);
        }
      }

      if (singleFile && opts.type === 'commits' && allContent) {
        const file = join(outDir, `commits-${Date.now()}.md`);
        await writeFile(file, allContent.replace(/\n\n---\n\n$/, ''), 'utf8');
        files.push(file);
      }

      progress.report({ increment: 100, message: t('completed') });
      
      console.log(`Export completed in ${Date.now() - startTime}ms`);
      
      if (files.length > 0) {
        const action = await vscode.window.showInformationMessage(
          t('exportedFiles', String(files.length)), 
          t('openFolder')
        );
        if (action === t('openFolder')) {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outDir));
        }
      } else {
        vscode.window.showWarningMessage(t('noChangesToExport'));
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    vscode.window.showErrorMessage(t('errorOccurred', error instanceof Error ? error.message : String(error)));
  }
}

async function checkGitRepo(cwd: string): Promise<void> {
  try {
    await sh('git rev-parse --git-dir', { cwd });
  } catch {
    throw new Error(t('notGitRepo'));
  }
}

async function pickMode(def: 'full'|'hunks'): Promise<'full'|'hunks'|undefined> {
  const items = [
    { 
      label: t('fullContextMode'), 
      value: 'full',
      description: t('fullContextDesc')
    },
    { 
      label: t('hunksOnlyMode'), 
      value: 'hunks',
      description: t('hunksOnlyDesc')
    }
  ];
  
  const defaultLabel = def === 'full' ? t('fullContextMode') : t('hunksOnlyMode');
  
  const picked = await vscode.window.showQuickPick(items, { 
    placeHolder: t('selectOutputMode', defaultLabel),
    ignoreFocusOut: true
  });
  return (picked?.value as 'full'|'hunks') ?? def;
}

async function getStagedTargets(cwd: string) {
  // Check if there are staged changes
  const { stdout: stagedOutput } = await sh('git diff --cached --name-only', { cwd });
  if (!stagedOutput.trim()) {
    // Check if there are any unstaged changes
    const { stdout: unstagedOutput } = await sh('git diff --name-only', { cwd });
    const { stdout: untrackedOutput } = await sh('git ls-files --others --exclude-standard', { cwd });
    
    const hasChanges = unstagedOutput.trim() || untrackedOutput.trim();
    
    if (!hasChanges) {
      vscode.window.showInformationMessage(t('noChangedFiles'));
      return null;
    }
    
    // Ask user if they want to stage all changes
    const action = await vscode.window.showWarningMessage(
      t('askToStageAll'),
      { modal: true },
      t('yes'),
      t('cancel')
    );
    
    if (action !== t('yes')) {
      return null;
    }
    
    // Stage all changes
    try {
      await sh('git add .', { cwd });
      vscode.window.showInformationMessage(t('allChangesStaged'));
    } catch (error) {
      vscode.window.showErrorMessage(t('stagingError', error instanceof Error ? error.message : String(error)));
      return null;
    }
  }
  
  return [{ label: 'staged', detail: 'staged', description: t('stagedChangesDesc') }];
}

async function pickCommits(cwd: string) {
  try {
    const { stdout } = await sh('git rev-list --max-count=50 --oneline HEAD', { cwd });
    const lines = stdout.trim().split('\n').filter(Boolean);
    
    const metas = lines.map(line => {
      const [hash, ...messageParts] = line.split(' ');
      const message = messageParts.join(' ');
      return { 
        label: `${hash} ${message}`, 
        detail: hash,
        description: message
      };
    });

    return vscode.window.showQuickPick(metas, { 
      canPickMany: true, 
      matchOnDescription: true, 
      placeHolder: t('selectCommitsToExport'),
      ignoreFocusOut: true
    });
  } catch (error) {
    throw new Error(t('cannotGetCommitList', error instanceof Error ? error.message : String(error)));
  }
}

async function getCommitMeta(cwd: string, hash: string): Promise<CommitMeta> {
  try {
    const { stdout } = await sh(`git show -s --format="%H|%h|%s|%ci|%an" ${hash}`, { cwd });
    const [H, h, subject, date, author] = stdout.trim().split('|');
    return { 
      title: subject || 'No commit message', 
      author: author || 'Unknown',
      date: date || '', 
      hash: H || hash, 
      short: h || hash.substring(0, 7) 
    };
  } catch (error) {
    throw new Error(t('cannotGetCommitInfo', error instanceof Error ? error.message : String(error)));
  }
}

function splitByFile(diffAll: string): DiffFile[] {
  const files: DiffFile[] = [];
  const blocks = diffAll.split(/\n(?=diff --git )/g).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.split('\n');
    const diffLine = lines.find(line => line.startsWith('diff --git '));
    
    if (!diffLine) {continue;}

    const match = diffLine.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) {continue;}

    const [, pathA, pathB] = match;
    let status: DiffFile['status'] = 'modified';
    let renameFrom: string | undefined;
    let renameTo: string | undefined;
    let isBinary = false;

    for (const line of lines) {
      if (line.startsWith('new file mode')) {
        status = 'added';
      } else if (line.startsWith('deleted file mode')) {
        status = 'deleted';
      } else if (line.startsWith('rename from ')) {
        status = 'renamed';
        renameFrom = line.substring('rename from '.length);
      } else if (line.startsWith('rename to ')) {
        renameTo = line.substring('rename to '.length);
      } else if (line.startsWith('copy from ')) {
        status = 'copied';
      } else if ((line.includes('Binary files ') && line.includes(' differ')) || line.includes('GIT binary patch')) {
        isBinary = true;
      }
    }

    const hunks = parseHunks(lines);
    const headerEndIndex = lines.findIndex(line => line.startsWith('@@'));
    const header = headerEndIndex === -1 ? block : lines.slice(0, headerEndIndex).join('\n');
    const body = headerEndIndex === -1 ? '' : lines.slice(headerEndIndex).join('\n');

    files.push({
      header,
      body,
      status,
      pathA,
      pathB,
      isBinary,
      hunks,
      renameFrom,
      renameTo
    });
  }

  return files;
}

function parseHunks(lines: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      
      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const [, oldStart, oldCount = '1', newStart, newCount = '1'] = match;
        currentHunk = {
          header: line,
          lines: [],
          oldStart: parseInt(oldStart),
          oldCount: parseInt(oldCount),
          newStart: parseInt(newStart),
          newCount: parseInt(newCount)
        };
      }
    } else if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
      currentHunk.lines.push(line);
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

async function renderMarkdown(
  meta: CommitMeta, 
  files: DiffFile[], 
  mode: 'full' | 'hunks',
  options: { maxFileBytes: number; detectBinary: boolean; cwd: string }
): Promise<string> {
  
  const lines: string[] = [];
  
  lines.push(`# ${meta.hash ? `Commit ${meta.short} - ` : ''}${meta.title}`);
  
  if (meta.author || meta.date) {
    lines.push('');
    if (meta.author) {lines.push(`- **Author**: ${meta.author}`);}
    if (meta.date) {lines.push(`- **Date**: ${meta.date}`);}
    if (meta.hash) {lines.push(`- **Hash**: ${meta.hash}`);}
  }

  if (files.length === 0) {
    lines.push('', t('noFilesChanged'));
    return lines.join('\n');
  }

  lines.push('', '## Files Changed');
  
  for (const file of files) {
    lines.push('', `### ${file.pathB || file.pathA}`);
    lines.push(`- **Status**: ${file.status}`);
    
    if (file.renameFrom && file.renameTo) {
      lines.push(`- **Rename**: ${file.renameFrom} → ${file.renameTo}`);
    }
    
    const ext = (file.pathB || file.pathA).split('.').pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);
    if (language) {
      lines.push(`- **Language**: ${language}`);
    }

    // Improved binary detection - check if actually binary or just large
    const isTextFile = isLikelyTextFile(file.pathB || file.pathA);
    
    if (file.isBinary && options.detectBinary && !isTextFile) {
      lines.push('', '**Binary file - content omitted**');
      continue;
    }

    if (file.hunks.length === 0 && file.status !== 'deleted' && file.status !== 'added') {
      lines.push('', 'No changes in hunks.');
      continue;
    }

    lines.push('');
    
    if (mode === 'full') {
      // For full mode, try to show the complete file with changes highlighted
      if (meta.hash) {
        // For commits, we can get the full file content for all status types
        try {
          const fullContent = await getFullFileContent(
            options.cwd, 
            meta.hash, 
            file.pathB || file.pathA,
            file.hunks,
            options.maxFileBytes,
            file.status
          );
          lines.push('```diff');
          lines.push(fullContent);
          lines.push('```');
        } catch (e) {
          // Fallback to regular diff if we can't get full content
          lines.push('```diff');
          lines.push(file.body);
          lines.push('```');
        }
      } else {
        // For staged changes, use staged-specific function
        try {
          const fullContent = await getFullFileContentForStaged(
            options.cwd,
            file.pathB || file.pathA,
            file.hunks,
            file.status,
            file.renameFrom,
            options.maxFileBytes
          );
          lines.push('```diff');
          lines.push(fullContent);
          lines.push('```');
        } catch (e) {
          // Fallback to regular diff if we can't get full content
          lines.push('```diff');
          const content = file.body.length > options.maxFileBytes 
            ? file.body.substring(0, options.maxFileBytes) + '\n... (content truncated)'
            : file.body;
          lines.push(content);
          lines.push('```');
        }
      }
    } else {
      // Hunks-only mode
      if (file.status === 'added') {
        // For added files, show summary instead of full content
        const totalLines = file.body.split('\n').filter(line => line.startsWith('+')).length;
        lines.push('```diff');
        lines.push('@@ -0,0 +1,' + totalLines + ' @@');
        lines.push('... (new file with ' + totalLines + ' lines)');
        lines.push('```');
        lines.push(`*Changes: +${totalLines} lines, -0 lines*`);
      } else if (file.status === 'deleted') {
        // For deleted files, show summary instead of full content
        const totalLines = file.body.split('\n').filter(line => line.startsWith('-')).length;
        lines.push('```diff');
        lines.push('@@ -1,' + totalLines + ' +0,0 @@');
        lines.push('... (file deleted with ' + totalLines + ' lines)');
        lines.push('```');
        lines.push(`*Changes: +0 lines, -${totalLines} lines*`);
      } else {
        // For modified/renamed files, show only changed lines
        lines.push('```diff');
        let addedLines = 0;
        let removedLines = 0;
        
        for (const hunk of file.hunks) {
          lines.push(hunk.header);
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
        
        // Add summary for hunks-only mode
        if (addedLines > 0 || removedLines > 0) {
          lines.push(`*Changes: +${addedLines} lines, -${removedLines} lines*`);
        }
      }
    }
  }

  return lines.join('\n');
}

function getLanguageFromExtension(ext?: string): string {
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

function isLikelyTextFile(path: string): boolean {
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
      /^\..*rc$/i,  // .bashrc, .vimrc, etc
      /^\..*config$/i
    ];
    
    if (textFilePatterns.some(pattern => pattern.test(fileName))) {
      return true;
    }
  }
  
  return false;
}

async function getFullFileContentForStaged(
  cwd: string,
  filePath: string,
  hunks: DiffHunk[],
  status: 'added'|'modified'|'deleted'|'renamed'|'copied',
  renameFrom?: string,
  maxBytes: number = 50 * 1024 * 1024
): Promise<string> {
  try {
    const afterPath = (status === 'deleted') ? null : filePath;
    const beforePath = (status === 'added') ? null : (renameFrom ?? filePath);

    // Get staged (index) version
    const afterContent = afterPath
      ? (await sh(`git show :${afterPath}`, { cwd, maxBuffer: maxBytes }).catch(() => ({ stdout: '' }))).stdout
      : '';
    
    // Get HEAD version 
    const beforeContent = beforePath
      ? (await sh(`git show HEAD:${beforePath}`, { cwd, maxBuffer: maxBytes }).catch(() => ({ stdout: '' }))).stdout
      : '';

    const afterLines = afterContent.split('\n');
    const result: string[] = [];

    // Build maps for deleted and added lines (same logic as commit version)
    const removedLines = new Map<number, string[]>();
    const addedLineSet = new Set<number>();

    for (const hunk of hunks) {
      let newLn = hunk.newStart;
      let oldLn = hunk.oldStart;
      const removed: string[] = [];
      
      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          addedLineSet.add(newLn);
          newLn++;
        } else if (line.startsWith('-')) {
          removed.push(line);
          oldLn++;
        } else {
          // Context line
          if (removed.length > 0) {
            removedLines.set(newLn, removed.splice(0));
          }
          newLn++;
          oldLn++;
        }
      }
      
      // Handle remaining removed lines at end of hunk
      if (removed.length > 0) {
        removedLines.set(newLn, removed);
      }
    }

    // Add hunk headers at the beginning for reference
    for (const hunk of hunks) {
      result.push(hunk.header);
    }
    
    if (hunks.length > 0) {
      result.push(''); // Empty line after headers
    }

    // Process the file line by line - show ALL lines with proper prefixes
    let totalSize = 0;
    for (let i = 0; i < afterLines.length; i++) {
      const lineNum = i + 1;
      
      // Insert removed lines before this line if any
      if (removedLines.has(lineNum)) {
        const removed = removedLines.get(lineNum)!;
        for (const removedLine of removed) {
          result.push(removedLine);
          totalSize += Buffer.byteLength(removedLine + '\n', 'utf8');
        }
      }
      
      // Add current line with appropriate prefix
      const prefix = addedLineSet.has(lineNum) ? '+' : ' ';
      const outputLine = prefix + afterLines[i];
      totalSize += Buffer.byteLength(outputLine + '\n', 'utf8');
      
      // Check size limit
      if (totalSize > maxBytes) {
        result.push(`... (truncated at line ${lineNum}, ${afterLines.length - i} lines omitted)`);
        break;
      }
      
      result.push(outputLine);
    }
    
    // Handle any remaining removed lines at the end of the file
    const lastLineNum = afterLines.length + 1;
    if (removedLines.has(lastLineNum)) {
      const removed = removedLines.get(lastLineNum)!;
      for (const removedLine of removed) {
        result.push(removedLine);
        totalSize += Buffer.byteLength(removedLine + '\n', 'utf8');
      }
    }
    
    return result.join('\n');
  } catch (error) {
    throw new Error(`Could not get full file content for staged: ${error}`);
  }
}

async function getFullFileContent(
  cwd: string,
  commitHash: string,
  filePath: string,
  hunks: DiffHunk[],
  maxBytes: number,
  status?: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied'
): Promise<string> {
  try {
    let afterContent = '';
    let beforeContent = '';
    
    // Handle different file statuses for commits
    if (status === 'deleted') {
      // For deleted files, only get the before content (from previous commit)
      try {
        const { stdout } = await sh(
          `git show ${commitHash}^:"${filePath}"`,
          { cwd, maxBuffer: 50 * 1024 * 1024 }
        );
        beforeContent = stdout;
      } catch {
        beforeContent = '';
      }
      afterContent = ''; // File doesn't exist after deletion
    } else if (status === 'added') {
      // For added files, only get the after content (from current commit)
      try {
        const { stdout } = await sh(
          `git show ${commitHash}:"${filePath}"`,
          { cwd, maxBuffer: 50 * 1024 * 1024 }
        );
        afterContent = stdout;
      } catch {
        afterContent = '';
      }
      beforeContent = ''; // File didn't exist before
    } else {
      // For modified/renamed/copied files, get both versions
      try {
        const { stdout: afterContentResult } = await sh(
          `git show ${commitHash}:"${filePath}"`,
          { cwd, maxBuffer: 50 * 1024 * 1024 }
        );
        afterContent = afterContentResult;
      } catch {
        afterContent = '';
      }
      
      try {
        const { stdout } = await sh(
          `git show ${commitHash}^:"${filePath}"`,
          { cwd, maxBuffer: 50 * 1024 * 1024 }
        );
        beforeContent = stdout;
      } catch {
        // File might be new in this commit
        beforeContent = '';
      }
    }
    
    // Build the output with change markers
    const result: string[] = [];
    let totalSize = 0;
    
    // Add hunk headers at the beginning for reference
    for (const hunk of hunks) {
      result.push(hunk.header);
    }
    
    if (hunks.length > 0) {
      result.push(''); // Empty line after headers
    }
    
    // Handle different file statuses
    if (status === 'deleted') {
      // For deleted files, show all lines from before content with '-' prefix
      const beforeLines = beforeContent.split('\n');
      for (let i = 0; i < beforeLines.length; i++) {
        const line = beforeLines[i];
        const outputLine = '-' + line;
        totalSize += Buffer.byteLength(outputLine + '\n', 'utf8');
        
        // Check size limit
        if (totalSize > maxBytes) {
          result.push(`... (truncated at line ${i + 1}, ${beforeLines.length - i} lines omitted)`);
          break;
        }
        
        result.push(outputLine);
      }
    } else if (status === 'added') {
      // For added files, show all lines from after content with '+' prefix
      const afterLines = afterContent.split('\n');
      for (let i = 0; i < afterLines.length; i++) {
        const line = afterLines[i];
        const outputLine = '+' + line;
        totalSize += Buffer.byteLength(outputLine + '\n', 'utf8');
        
        // Check size limit
        if (totalSize > maxBytes) {
          result.push(`... (truncated at line ${i + 1}, ${afterLines.length - i} lines omitted)`);
          break;
        }
        
        result.push(outputLine);
      }
    } else {
      // For modified/renamed/copied files, use the original logic
      const afterLines = afterContent.split('\n');
      const beforeLines = beforeContent.split('\n');
      
      // Build a map of changed line numbers from hunks
      const changedLines = new Set<number>();
      const addedLines = new Set<number>();
      const removedLines = new Map<number, string[]>();
      
      for (const hunk of hunks) {
        let currentNewLine = hunk.newStart;
        let currentOldLine = hunk.oldStart;
        const removedInHunk: string[] = [];
        
        for (const line of hunk.lines) {
          if (line.startsWith('+')) {
            addedLines.add(currentNewLine);
            changedLines.add(currentNewLine);
            currentNewLine++;
          } else if (line.startsWith('-')) {
            removedInHunk.push(line);
            currentOldLine++;
          } else {
            // Context line
            if (removedInHunk.length > 0) {
              removedLines.set(currentNewLine, removedInHunk.splice(0));
            }
            currentNewLine++;
            currentOldLine++;
          }
        }
        
        // Handle any remaining removed lines at the end of the hunk
        if (removedInHunk.length > 0) {
          removedLines.set(currentNewLine, removedInHunk);
        }
      }
      
      // Process the file line by line - show ALL lines with proper prefixes
      for (let i = 0; i < afterLines.length; i++) {
        const lineNum = i + 1;
        const line = afterLines[i];
        
        // Check if we need to insert removed lines before this line
        if (removedLines.has(lineNum)) {
          const removed = removedLines.get(lineNum)!;
          for (const removedLine of removed) {
            result.push(removedLine);
            totalSize += Buffer.byteLength(removedLine + '\n', 'utf8');
          }
        }
        
        // Add the current line with appropriate prefix
        let prefix = ' '; // Default: unchanged line
        if (addedLines.has(lineNum)) {
          prefix = '+';
        }
        
        const outputLine = prefix + line;
        totalSize += Buffer.byteLength(outputLine + '\n', 'utf8');
        
        // Check size limit
        if (totalSize > maxBytes) {
          result.push(`... (truncated at line ${lineNum}, ${afterLines.length - i} lines omitted)`);
          break;
        }
        
        result.push(outputLine);
      }
      
      // Handle any remaining removed lines at the end of the file
      const lastLineNum = afterLines.length + 1;
      if (removedLines.has(lastLineNum)) {
        const removed = removedLines.get(lastLineNum)!;
        for (const removedLine of removed) {
          result.push(removedLine);
          totalSize += Buffer.byteLength(removedLine + '\n', 'utf8');
        }
      }
    }
    
    return result.join('\n');
  } catch (error) {
    // If we can't get full content, throw to trigger fallback
    throw new Error(`Could not get full file content: ${error}`);
  }
}

async function quickExportCommits() {
  try {
    const cfg = vscode.workspace.getConfiguration('diffscribe');
    const modeDefault = cfg.get<'full'|'hunks'>('defaultMode', 'hunks');
    
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      return vscode.window.showErrorMessage(t('noWorkspaceFolder'));
    }
    const cwd = ws.uri.fsPath;
    await checkGitRepo(cwd);

    const commits = await pickCommits(cwd);
    if (!commits || commits.length === 0) {return;}

    await exportWithDefaults({ type: 'commits', targets: commits, mode: modeDefault, cwd });
  } catch (error) {
    vscode.window.showErrorMessage(t('errorOccurred', error instanceof Error ? error.message : String(error)));
  }
}

async function quickExportStaged() {
  try {
    const cfg = vscode.workspace.getConfiguration('diffscribe');
    const modeDefault = cfg.get<'full'|'hunks'>('defaultMode', 'hunks');
    
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      return vscode.window.showErrorMessage(t('noWorkspaceFolder'));
    }
    const cwd = ws.uri.fsPath;
    await checkGitRepo(cwd);

    // Check if there are staged changes
    const { stdout: stagedOutput2 } = await sh('git diff --cached --name-only', { cwd });
    if (!stagedOutput2.trim()) {
      // Check if there are any unstaged changes
      const { stdout: unstagedOutput2 } = await sh('git diff --name-only', { cwd });
      const { stdout: untrackedOutput2 } = await sh('git ls-files --others --exclude-standard', { cwd });
      
      const hasChanges = unstagedOutput2.trim() || untrackedOutput2.trim();
      
      if (!hasChanges) {
        return vscode.window.showInformationMessage(t('noChangedFiles'));
      }
      
      // Ask user if they want to stage all changes
      const action = await vscode.window.showWarningMessage(
        t('askToStageAll'),
        { modal: true },
        t('yes'),
        t('cancel')
      );
      
      if (action !== t('yes')) {
        return;
      }
      
      // Stage all changes
      try {
        await sh('git add .', { cwd });
        vscode.window.showInformationMessage(t('allChangesStaged'));
      } catch (error) {
        return vscode.window.showErrorMessage(t('stagingError', error instanceof Error ? error.message : String(error)));
      }
    }

    const targets = [{ label: 'staged', detail: 'staged', description: t('exportStagedDesc') }];
    await exportWithDefaults({ type: 'staged', targets, mode: modeDefault, cwd });
  } catch (error) {
    vscode.window.showErrorMessage(t('errorOccurred', error instanceof Error ? error.message : String(error)));
  }
}

async function exportWithDefaults(opts: { 
  type: 'commits' | 'staged'; 
  targets: any[]; 
  mode: 'full' | 'hunks'; 
  cwd: string 
}) {
  const cfg = vscode.workspace.getConfiguration('diffscribe');
  const unified = cfg.get<number>('unifiedContext', 3);
  const includeRenames = cfg.get<boolean>('includeRenames', true);
  const singleFile = cfg.get<boolean>('singleFile', true);
  const outDirCfg = cfg.get<string>('outputDirectory', 'diffscribe');
  const detectBinary = cfg.get<boolean>('detectBinary', true);
  
  const maxFileBytes = cfg.get<number>('maxFileBytes', 2000000);

  const defaultOutDir = join(opts.cwd, outDirCfg);
  await mkdir(defaultOutDir, { recursive: true });

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "DiffScribe",
    cancellable: false
  }, async (progress) => {
    const files: string[] = [];
    const renameOpt = includeRenames ? '--find-renames' : '';
    
    let allContent = '';
    const total = opts.targets.length;

    for (let i = 0; i < opts.targets.length; i++) {
      const target = opts.targets[i];
      const seq = String(i + 1).padStart(4, '0');
      
      progress.report({ 
        increment: 100 / total, 
        message: t('processing', String(i + 1), String(total), target.label) 
      });

      const meta = opts.type === 'commits'
        ? await getCommitMeta(opts.cwd, target.detail)
        : { title: 'Staged Changes', author: '', date: new Date().toISOString(), hash: '', short: 'staged' };

      const diffCmd = opts.type === 'commits'
        ? `git show ${target.detail} --pretty=format: --unified=${unified} ${renameOpt} --diff-filter=ACMRTUXB`
        : `git diff --cached --unified=${unified} ${renameOpt} --diff-filter=ACMRTUXB`;
      const { stdout: diff } = await sh(diffCmd, { cwd: opts.cwd, maxBuffer: 50 * 1024 * 1024 });

      if (!diff.trim()) {
        continue;
      }

      const blocks = splitByFile(diff);
      const rendered = await renderMarkdown(meta, blocks, opts.mode, { 
        maxFileBytes, 
        detectBinary, 
        cwd: opts.cwd 
      });

      if (singleFile && opts.type === 'commits') {
        allContent += rendered + '\n\n---\n\n';
      } else {
        const name = opts.type === 'commits' 
          ? `diff-${seq}-${meta.short}.md` 
          : `diff-staged-${Date.now()}.md`;
        const file = join(defaultOutDir, name);
        await writeFile(file, rendered, 'utf8');
        files.push(file);
      }
    }

    if (singleFile && opts.type === 'commits' && allContent) {
      const file = join(defaultOutDir, `commits-${Date.now()}.md`);
      await writeFile(file, allContent.replace(/\n\n---\n\n$/, ''), 'utf8');
      files.push(file);
    }

    progress.report({ increment: 100, message: t('completed') });
    
    if (files.length > 0) {
      const action = await vscode.window.showInformationMessage(
        t('exportedFilesToDir', String(files.length), defaultOutDir), 
        t('openFolder'), t('openFile')
      );
      if (action === t('openFolder')) {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(defaultOutDir));
      } else if (action === t('openFile') && files[0]) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(files[0]));
      }
      
      console.log('Export completed successfully');
      
    } else {
      vscode.window.showWarningMessage(t('noChangesToExport'));
    }
  });
}


async function selectLanguage() {
  const cfg = vscode.workspace.getConfiguration('diffscribe');
  const currentLang = cfg.get<string>('language', 'en');
  
  const items = [
    { label: 'English', value: 'en', description: 'Use English interface' },
    { label: '한국어 (Korean)', value: 'ko', description: '한국어 인터페이스 사용' }
  ];
  
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Select language / 언어 선택 (Current: ${currentLang === 'en' ? 'English' : '한국어'})`,
    ignoreFocusOut: true
  });
  
  if (picked) {
    await cfg.update('language', picked.value, vscode.ConfigurationTarget.Global);
    const message = picked.value === 'en' 
      ? 'Language changed to English. Please reload to apply changes.'
      : '언어가 한국어로 변경되었습니다. 변경사항을 적용하려면 다시 로드하세요.';
    
    const reloadText = picked.value === 'en' ? 'Reload' : '다시 로드';
    const action = await vscode.window.showInformationMessage(message, reloadText);
    
    if (action === reloadText) {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  }
}

export function deactivate() {
  console.log('DiffScribe deactivated');
}