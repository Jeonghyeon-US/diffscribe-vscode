// Secure Git command utilities with comprehensive safety checks

import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

const safeExecFile = promisify(execFile);

export interface GitCommandResult {
  stdout: string;
  stderr: string;
}

export interface StreamingOptions {
  maxBytes: number;
  timeout?: number;
}

export class SecureGitCommands {
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private readonly DEFAULT_MAX_BUFFER = 50 * 1024 * 1024; // 50MB
  
  /**
   * Execute a Git command with comprehensive security checks
   */
  async safeGitCommand(
    args: string[], 
    cwd: string, 
    maxBuffer: number = this.DEFAULT_MAX_BUFFER
  ): Promise<GitCommandResult> {
    // 1. Git installation check
    await this.verifyGitInstallation(cwd);
    
    // 2. Repository validation (for commands that require a repo)
    await this.validateRepository(args, cwd);
    
    // 3. Argument validation and sanitization
    const sanitizedArgs = this.sanitizeArguments(args);
    
    // 4. Security validation
    this.validateSecurity(sanitizedArgs);
    
    // 5. Execute the command safely
    try {
      return await safeExecFile('git', sanitizedArgs, { 
        cwd, 
        maxBuffer, 
        encoding: 'utf8',
        timeout: this.DEFAULT_TIMEOUT
      });
    } catch (error) {
      throw this.enhanceGitError(error);
    }
  }
  
  /**
   * Stream file content from Git with memory safety
   */
  async getFileContentStreaming(
    cwd: string,
    gitReference: string,
    options: StreamingOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let truncated = false;
      
      // Input validation
      if (!gitReference || typeof gitReference !== 'string') {
        reject(new Error('Invalid git reference'));
        return;
      }
      
      // Security validation for git reference
      if (this.hasUnsafeCharacters(gitReference)) {
        reject(new Error('Potentially unsafe git reference'));
        return;
      }
      
      const git = spawn('git', ['show', gitReference], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      git.stdout.on('data', (chunk: Buffer) => {
        const chunkSize = chunk.length;
        
        if (totalSize + chunkSize > options.maxBytes) {
          // Truncate to stay within limit
          const remainingBytes = options.maxBytes - totalSize;
          if (remainingBytes > 0) {
            chunks.push(chunk.subarray(0, remainingBytes));
            totalSize = options.maxBytes;
          }
          truncated = true;
          git.kill('SIGTERM');
          return;
        }
        
        chunks.push(chunk);
        totalSize += chunkSize;
      });
      
      git.stderr.on('data', (chunk: Buffer) => {
        const errorMsg = chunk.toString('utf8');
        if (errorMsg.includes('fatal:')) {
          git.kill('SIGTERM');
          reject(new Error(`Git error: ${errorMsg.trim()}`));
        }
      });
      
      git.on('close', (code) => {
        if (code === 0 || truncated) {
          const content = Buffer.concat(chunks).toString('utf8');
          if (truncated) {
            resolve(content + '\n\n[Content truncated due to size limit]');
          } else {
            resolve(content);
          }
        } else {
          reject(new Error(`Git command exited with code ${code}`));
        }
      });
      
      git.on('error', (error) => {
        reject(new Error(`Git spawn error: ${error.message}`));
      });
      
      // Timeout handling
      const timeoutMs = options.timeout || this.DEFAULT_TIMEOUT;
      const timeoutId = setTimeout(() => {
        git.kill('SIGTERM');
        reject(new Error('Git command timed out'));
      }, timeoutMs);
      
      git.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
  
  /**
   * Get diff content safely with size limits
   */
  async getDiffSafely(
    cwd: string,
    fromRef: string,
    toRef?: string,
    options: {
      unified?: number;
      maxBuffer?: number;
      includeRenames?: boolean;
    } = {}
  ): Promise<string> {
    const args = ['diff'];
    
    if (options.unified !== undefined) {
      args.push(`--unified=${options.unified}`);
    }
    
    if (options.includeRenames) {
      args.push('--find-renames');
    }
    
    args.push('--diff-filter=ACMRTUXB');
    
    if (toRef) {
      args.push(fromRef, toRef);
    } else {
      args.push(fromRef);
    }
    
    const result = await this.safeGitCommand(args, cwd, options.maxBuffer);
    return result.stdout;
  }
  
  /**
   * Get commit information safely
   */
  async getCommitInfo(
    cwd: string,
    commitHash: string,
    format: string = '--pretty=format:%H|%h|%an|%ae|%ad|%s'
  ): Promise<{
    hash: string;
    short: string;
    author: string;
    email: string;
    date: string;
    message: string;
  }> {
    // Validate commit hash format
    if (!/^[a-f0-9]{6,40}$/i.test(commitHash)) {
      throw new Error('Invalid commit hash format');
    }
    
    const result = await this.safeGitCommand(
      ['show', '--no-patch', format, commitHash],
      cwd
    );
    
    const parts = result.stdout.trim().split('|');
    if (parts.length !== 6) {
      throw new Error('Unexpected git output format');
    }
    
    return {
      hash: parts[0],
      short: parts[1],
      author: parts[2],
      email: parts[3],
      date: parts[4],
      message: parts[5]
    };
  }
  
  /**
   * List commits safely with pagination
   */
  async listCommits(
    cwd: string,
    options: {
      maxCount?: number;
      since?: string;
      until?: string;
      author?: string;
      grep?: string;
    } = {}
  ): Promise<Array<{
    hash: string;
    short: string;
    author: string;
    date: string;
    message: string;
  }>> {
    const args = ['log', '--pretty=format:%H|%h|%an|%ad|%s', '--date=short'];
    
    if (options.maxCount) {
      args.push(`--max-count=${Math.min(options.maxCount, 1000)}`); // Limit to prevent abuse
    }
    
    if (options.since) {
      args.push(`--since=${options.since}`);
    }
    
    if (options.until) {
      args.push(`--until=${options.until}`);
    }
    
    if (options.author) {
      // Sanitize author input
      const sanitizedAuthor = options.author.replace(/[;&|`$(){}[\]<>]/g, '');
      args.push(`--author=${sanitizedAuthor}`);
    }
    
    if (options.grep) {
      // Sanitize grep input
      const sanitizedGrep = options.grep.replace(/[;&|`$(){}[\]<>]/g, '');
      args.push(`--grep=${sanitizedGrep}`);
    }
    
    const result = await this.safeGitCommand(args, cwd);
    
    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|');
        return {
          hash: parts[0],
          short: parts[1],
          author: parts[2],
          date: parts[3],
          message: parts.slice(4).join('|') // Handle messages with | characters
        };
      });
  }
  
  /**
   * Check if working directory is clean
   */
  async isWorkingDirectoryClean(cwd: string): Promise<boolean> {
    try {
      const result = await this.safeGitCommand(['status', '--porcelain'], cwd);
      return result.stdout.trim() === '';
    } catch (error) {
      throw new Error(`Failed to check working directory status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get current branch name
   */
  async getCurrentBranch(cwd: string): Promise<string> {
    try {
      const result = await this.safeGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
      return result.stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Verify Git installation
   */
  private async verifyGitInstallation(cwd: string): Promise<void> {
    try {
      await safeExecFile('git', ['--version'], { cwd, timeout: 5000 });
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('Git is not installed or not found in PATH. Please install Git first.');
      }
      throw new Error(`Git version check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validate repository for commands that require it
   */
  private async validateRepository(args: string[], cwd: string): Promise<void> {
    const requiresRepo = !['--version', 'init', 'clone'].some(cmd => args.includes(cmd));
    if (!requiresRepo) {
      return;
    }
    
    try {
      await safeExecFile('git', ['rev-parse', '--git-dir'], { cwd, timeout: 5000 });
    } catch (error) {
      // Try to get more detailed error information
      try {
        await safeExecFile('git', ['rev-parse', '--show-toplevel'], { cwd, timeout: 5000 });
      } catch {
        throw new Error(`Not a git repository: ${cwd}. Initialize with 'git init' or open a folder with a Git repository.`);
      }
    }
  }
  
  /**
   * Sanitize command arguments
   */
  private sanitizeArguments(args: string[]): string[] {
    return args.map(arg => {
      if (typeof arg !== 'string') {
        throw new Error('Invalid argument type');
      }
      return arg.trim();
    });
  }
  
  /**
   * Validate security of arguments
   */
  private validateSecurity(args: string[]): void {
    for (const arg of args) {
      if (!arg || arg === '') {
        throw new Error('Empty or whitespace-only argument');
      }
      
      // Command injection prevention
      if (this.hasUnsafeCharacters(arg)) {
        throw new Error(`Potentially unsafe argument: ${arg}`);
      }
      
      // Path traversal prevention
      if (arg.includes('../') || arg.includes('..\\')) {
        throw new Error(`Path traversal attempt detected: ${arg}`);
      }
      
      // Null byte injection prevention
      if (arg.includes('\0')) {
        throw new Error(`Null byte injection attempt detected: ${arg}`);
      }
    }
  }
  
  /**
   * Check for unsafe characters
   * Allow % and | for Git format strings
   */
  private hasUnsafeCharacters(input: string): boolean {
    // Allow % and | for legitimate Git format strings like --format=%H|%h|%s
    if (input.startsWith('--format=') || input.startsWith('--pretty=')) {
      // Only check for really dangerous characters in format strings
      return /[;&`$(){}[\]<>]/.test(input);
    }
    return /[;&|`$(){}[\]<>]/.test(input);
  }
  
  /**
   * Enhance Git error messages with more context
   */
  private enhanceGitError(error: any): Error {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new Error('Git command timed out. Repository might be too large or corrupted.');
      }
      if (error.message.includes('fatal: bad object')) {
        return new Error('Git object not found. The commit or reference may not exist.');
      }
      if (error.message.includes('fatal: ambiguous argument')) {
        return new Error('Git reference is ambiguous. Please specify a valid commit hash or branch name.');
      }
      if (error.message.includes('does not exist in')) {
        return new Error('File or path does not exist in the specified commit.');
      }
      if (error.message.includes('not a git repository')) {
        return new Error('Not a Git repository. Please open a folder containing a Git repository.');
      }
    }
    
    // Return enhanced error with original message
    return new Error(`Git command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}