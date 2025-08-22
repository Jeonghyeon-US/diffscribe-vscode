/**
 * Diff Parser Module - Platform Independent
 * 
 * Handles parsing of git diff output into structured data.
 * No VSCode dependencies.
 */

import { DiffFile, DiffHunk } from './types';

export class DiffParser {
  /**
   * Split diff content by files
   */
  splitByFile(diffAll: string): DiffFile[] {
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

      // Parse file metadata
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

      // Parse hunks
      const hunks = this.parseHunks(lines);
      
      // Split header and body
      const headerEndIndex = lines.findIndex(line => line.startsWith('@@'));
      const header = headerEndIndex === -1 ? block : lines.slice(0, headerEndIndex).join('\n');
      const body = headerEndIndex === -1 ? '' : lines.slice(headerEndIndex).join('\n');

      files.push({
        header,
        body,
        status,
        pathA,
        pathB,
        oldPath: pathA,      // Backward compatibility
        newPath: pathB,      // Backward compatibility
        isBinary,
        hunks,
        renameFrom,
        renameTo
      });
    }

    return files;
  }

  /**
   * Parse diff hunks from lines
   */
  parseHunks(lines: string[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Save previous hunk if exists
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        
        // Parse hunk header
        const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          const [, oldStart, oldCount = '1', newStart, newCount = '1'] = match;
          const oldCountNum = parseInt(oldCount);
          const newCountNum = parseInt(newCount);
          currentHunk = {
            header: line,
            lines: [],
            oldStart: parseInt(oldStart),
            newStart: parseInt(newStart),
            oldCount: oldCountNum,
            newCount: newCountNum,
            oldLines: oldCountNum,    // Backward compatibility
            newLines: newCountNum     // Backward compatibility
          };
        }
      } else if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
        // Add line to current hunk
        currentHunk.lines.push(line);
      }
    }

    // Don't forget the last hunk
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Parse a single diff block into structured data
   */
  parseDiffBlock(diffBlock: string): DiffFile | null {
    const files = this.splitByFile(diffBlock);
    return files.length > 0 ? files[0] : null;
  }

  /**
   * Count additions and deletions in a diff
   */
  countChanges(files: DiffFile[]): { additions: number; deletions: number } {
    let additions = 0;
    let deletions = 0;

    for (const file of files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith('+')) {
            additions++;
          } else if (line.startsWith('-')) {
            deletions++;
          }
        }
      }
    }

    return { additions, deletions };
  }

  /**
   * Extract changed line numbers from hunks
   */
  getChangedLineNumbers(hunks: DiffHunk[]): { old: number[]; new: number[] } {
    const oldLines: number[] = [];
    const newLines: number[] = [];

    for (const hunk of hunks) {
      let oldLineNum = hunk.oldStart;
      let newLineNum = hunk.newStart;

      for (const line of hunk.lines) {
        if (line.startsWith('-')) {
          oldLines.push(oldLineNum++);
        } else if (line.startsWith('+')) {
          newLines.push(newLineNum++);
        } else if (line.startsWith(' ')) {
          oldLineNum++;
          newLineNum++;
        }
      }
    }

    return { old: oldLines, new: newLines };
  }

  /**
   * Check if a file has substantial changes
   */
  hasSubstantialChanges(file: DiffFile, threshold: number = 10): boolean {
    let changes = 0;
    
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith('+') || line.startsWith('-')) {
          changes++;
          if (changes >= threshold) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Filter files by status
   */
  filterByStatus(files: DiffFile[], status: DiffFile['status'][]): DiffFile[] {
    return files.filter(file => status.includes(file.status));
  }

  /**
   * Get file extension
   */
  getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Group files by extension
   */
  groupByExtension(files: DiffFile[]): Map<string, DiffFile[]> {
    const groups = new Map<string, DiffFile[]>();
    
    for (const file of files) {
      const path = file.newPath || file.oldPath;
      const ext = this.getFileExtension(path);
      
      if (!groups.has(ext)) {
        groups.set(ext, []);
      }
      groups.get(ext)!.push(file);
    }
    
    return groups;
  }

  /**
   * Sort files by change size (most changes first)
   */
  sortByChangeSize(files: DiffFile[]): DiffFile[] {
    return files.sort((a, b) => {
      const aChanges = a.hunks.reduce((sum, h) => 
        sum + h.lines.filter(l => l.startsWith('+') || l.startsWith('-')).length, 0);
      const bChanges = b.hunks.reduce((sum, h) => 
        sum + h.lines.filter(l => l.startsWith('+') || l.startsWith('-')).length, 0);
      return bChanges - aChanges;
    });
  }

  /**
   * Extract context lines around changes
   */
  extractContext(hunk: DiffHunk, contextSize: number = 3): string[] {
    const result: string[] = [];
    const lines = hunk.lines;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('+') || line.startsWith('-')) {
        // Include context before
        const startContext = Math.max(0, i - contextSize);
        for (let j = startContext; j < i; j++) {
          if (!result.includes(lines[j])) {
            result.push(lines[j]);
          }
        }
        
        // Include the change
        result.push(line);
        
        // Include context after
        const endContext = Math.min(lines.length, i + contextSize + 1);
        for (let j = i + 1; j < endContext; j++) {
          if (lines[j].startsWith(' ')) {
            result.push(lines[j]);
          } else {
            break;
          }
        }
      }
    }
    
    return result;
  }
}

export default DiffParser;