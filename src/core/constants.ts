// Core constants for DiffScribe

export const DEFAULT_CONFIG = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_TOKENS: {
    'gpt-4': 8000,
    'gpt-3.5-turbo': 4000,
    'claude-3': 8000,
    'default': 2000
  },
  COMPRESSION_RATIO: {
    CHANGES_PRIORITY: 0.7, // 70% for changes, 30% for context
    MAX_RATIO: 0.8 // Don't compress more than 80%
  }
} as const;

export const SECURITY_PATTERNS = {
  CRITICAL: [
    {
      name: 'API Key',
      regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      severity: 'critical' as const,
      description: 'Hardcoded API key detected'
    },
    {
      name: 'Password',
      regex: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      severity: 'high' as const,
      description: 'Hardcoded password detected'
    },
    {
      name: 'JWT Token',
      regex: /['"]eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"]/gi,
      severity: 'high' as const,
      description: 'JWT token exposed'
    }
  ],
  HIGH: [
    {
      name: 'Private Key',
      regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
      severity: 'critical' as const,
      description: 'Private key exposed'
    },
    {
      name: 'Database URL',
      regex: /(?:mongodb|mysql|postgres|redis):\/\/[^\s'"]+/gi,
      severity: 'high' as const,
      description: 'Database connection string exposed'
    }
  ],
  MEDIUM: [
    {
      name: 'SQL Injection Risk',
      regex: /DELETE\s+FROM\s+\w+(?:\s+WHERE\s+1\s*=\s*1)?/gi,
      severity: 'medium' as const,
      description: 'Potential SQL injection pattern'
    },
    {
      name: 'Command Injection',
      regex: /(?:exec|system|shell_exec|eval)\s*\([^)]*\$[^)]*\)/gi,
      severity: 'medium' as const,
      description: 'Potential command injection'
    }
  ]
} as const;

export const SUSPICIOUS_KEYWORDS = [
  'password', 'secret', 'token', 'key', 'auth', 'credential',
  'admin', 'root', 'sudo', 'exec', 'eval', 'dangerous',
  'bypass', 'hack', 'exploit', 'vulnerability'
] as const;

export const CRITICAL_FILE_PATTERNS = [
  '**/auth/**',
  '**/security/**',
  '**/payment/**',
  '**/*auth*',
  '**/*security*',
  '**/*payment*',
  '**/*.env*',
  '**/config/**'
] as const;

export const SUPPORTED_LANGUAGES = {
  'javascript': { extension: ['.js', '.mjs', '.cjs'], multiplier: 1.1 },
  'typescript': { extension: ['.ts', '.tsx'], multiplier: 1.1 },
  'python': { extension: ['.py', '.pyw'], multiplier: 0.9 },
  'java': { extension: ['.java'], multiplier: 1.2 },
  'go': { extension: ['.go'], multiplier: 1.0 },
  'rust': { extension: ['.rs'], multiplier: 1.0 },
  'korean': { extension: [], multiplier: 1.5 } // For Korean text detection
} as const;

export const AI_MODELS = {
  'gpt-4': { provider: 'openai', contextWindow: 8192 },
  'gpt-4-turbo': { provider: 'openai', contextWindow: 128000 },
  'gpt-3.5-turbo': { provider: 'openai', contextWindow: 4096 },
  'claude-3-opus': { provider: 'anthropic', contextWindow: 200000 },
  'claude-3-sonnet': { provider: 'anthropic', contextWindow: 200000 },
  'claude-3-haiku': { provider: 'anthropic', contextWindow: 200000 }
} as const;

export const MESSAGES = {
  EN: {
    CONFIG_WIZARD_TITLE: 'DiffScribe Configuration Wizard',
    FIRST_RUN_WELCOME: 'Welcome to DiffScribe! Let\'s set it up for your AI model.',
    SECURITY_WARNING: 'Security issues detected in commit',
    COMPRESSION_WARNING: 'Content was compressed to fit token limit',
    ERROR_PROCESSING: 'Error processing diff'
  },
  KO: {
    CONFIG_WIZARD_TITLE: 'DiffScribe 설정 마법사',
    FIRST_RUN_WELCOME: 'DiffScribe에 오신 것을 환영합니다! AI 모델에 맞게 설정해보겠습니다.',
    SECURITY_WARNING: '커밋에서 보안 문제가 감지되었습니다',
    COMPRESSION_WARNING: '토큰 한계에 맞추기 위해 내용이 압축되었습니다',
    ERROR_PROCESSING: 'diff 처리 중 오류가 발생했습니다'
  }
} as const;