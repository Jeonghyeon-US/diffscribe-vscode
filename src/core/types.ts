// Core types for DiffScribe modular architecture

// ===== LIBRARY CONFIGURATION (from interfaces.ts) =====

export interface DiffScribeConfig {
  cwd: string;                    // Required: Git repository path
  outputDir?: string;             // Optional: Output directory (default: 'diffscribe')
  maxFileBytes?: number;          // Optional: File size limit (default: 2MB)
  language?: 'en' | 'ko';        // Optional: Language (default: 'en')
  unifiedContext?: number;        // Optional: diff context lines (default: 3)
  includeRenames?: boolean;       // Optional: Rename detection (default: true)
}

export type ExportMode = 'full' | 'hunks' | 'supervisor';

export interface ExportResult {
  markdown: string;               // Generated markdown content
  tokenCount: number;            // Estimated token count
  riskScore: number;             // Security risk score (0-100, supervisor mode only)
  files: string[];               // List of affected files
  compressionRatio?: number;     // Compression ratio (if compressed)
}

// ===== CORE DATA STRUCTURES =====

export interface CommitMeta {
  hash: string;
  author: string;
  message: string;
  date: string;
  title?: string;                 // Alias for message (library compatibility)
  short?: string;                 // Short hash (library compatibility)
}

export interface DiffFile {
  // Core required fields (compatible with both styles)
  hunks: DiffHunk[];
  isBinary: boolean;
  
  // Path fields (support both naming conventions)
  pathA: string;                  // Source path (interfaces.ts style)
  pathB: string;                  // Target path (interfaces.ts style)
  oldPath: string;                // Alias for pathA (types.ts style)
  newPath: string;                // Alias for pathB (types.ts style)
  
  // Status fields (support both naming conventions)
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  changeType?: 'added' | 'deleted' | 'modified' | 'renamed'; // Alias for status
  
  // Content fields (optional for gradual migration)
  header?: string;                // Diff header
  body?: string;                  // Diff body
  
  // Optional metadata
  isLargeFile?: boolean;
  renameFrom?: string;
  renameTo?: string;
}

export interface DiffHunk {
  lines: string[];
  oldStart: number;
  newStart: number;
  
  // Count fields (support both naming conventions)
  oldCount: number;               // interfaces.ts style
  newCount: number;               // interfaces.ts style
  oldLines: number;               // Alias for oldCount (types.ts style)
  newLines: number;               // Alias for newCount (types.ts style)
  
  // Header field (optional for gradual migration)
  header?: string;
}

export interface Risk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  examples: string[];
  description?: string;
}

export interface RiskReport {
  definite: Risk[];
  suspicious: string[];
  totalRisks: number;
  criticalFiles: string[];
  riskScore: number;
}

export interface CompressedResult {
  text: string;
  originalLength: number;
  compressedLength: number;
  compressionRatio: number;
  warning?: string;
}

export interface ProcessedResult {
  success: boolean;
  content?: string;
  error?: string;
  details?: string;
  suggestions?: string[];
  riskReport?: RiskReport;
  tokenCount?: number;
  compressed?: CompressedResult;
}

export interface TokenEstimationResult {
  tokens: number;
  model: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'tiktoken' | 'estimation';
}

export interface SupervisorSummary {
  commitHash: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyChanges: string[];
  securityIssues: Risk[];
  recommendations: string[];
  tokenCount: number;
  timestamp: number;
}

// ===== CONTEXT MANAGEMENT =====

export interface AnalysisResult {
  commitHash: string;
  author: string;
  message: string;
  timestamp: number;
  files: string[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyChanges: string[];
  securityIssues: Risk[];
  recommendations: string[];
  tokenCount: number;
  patterns: string[];
  relatedCommits: string[];         // Related commit hashes
  contextNotes: string[];           // AI-generated context notes
}

export interface ContextQuery {
  commitHash?: string;
  files?: string[];
  timeRange?: {
    from: number;
    to: number;
  };
  riskLevel?: ('low' | 'medium' | 'high' | 'critical')[];
  author?: string;
  limit?: number;
}

export interface ContextResult {
  results: AnalysisResult[];
  totalCount: number;
  relevanceScore: number;          // How relevant the context is (0-1)
  summary: string;                 // AI-generated summary of context
}

export interface ConfigurationOptions {
  defaultMode: 'full' | 'hunks' | 'supervisor';
  maxTokens: number;
  preferredModel: string;
  securityLevel: 'minimal' | 'balanced' | 'high';
  language: 'en' | 'ko';
  enableMetrics: boolean;
}

export interface ModuleConfig {
  tokenizer?: {
    preferredModel: string;
    fallbackMethod: 'simple' | 'advanced';
  };
  patternDetector?: {
    securityLevel: 'minimal' | 'balanced' | 'high';
    customPatterns: string[];
  };
  compressor?: {
    prioritizeChanges: boolean;
    maxCompressionRatio: number;
  };
}

// ===== PRIORITY COMPRESSION =====

export interface PriorityRule {
  pattern: string;                    // File path pattern (glob style)
  priority: 'critical' | 'high' | 'medium' | 'low';
  maxTokens?: number;                 // Maximum tokens for this priority level
  compressionStrategy?: 'preserve' | 'summarize' | 'minimal' | 'omit';
  description?: string;               // Human-readable description
}

export interface PriorityAnalysis {
  filePath: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  allocatedTokens: number;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: 'preserve' | 'summarize' | 'minimal' | 'omit';
  matchedRule?: PriorityRule;
}

export interface PriorityCompressionResult {
  compressedText: string;
  originalTokens: number;
  compressedTokens: number;
  overallCompressionRatio: number;
  fileAnalyses: PriorityAnalysis[];
  appliedRules: PriorityRule[];
  warnings: string[];
}