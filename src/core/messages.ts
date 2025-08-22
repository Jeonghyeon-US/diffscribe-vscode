// Internationalization messages for DiffScribe

export const MESSAGES = {
  en: {
    noWorkspaceFolder: 'Please open a folder with a Git repository first.',
    notGitRepo: 'Not a Git repository. Please use in a Git-initialized project.',
    cannotGetCommitList: 'Cannot get commit list: {0}',
    cannotGetCommitInfo: 'Cannot get commit info: {0}',
    noChangedFiles: 'No files changed.',
    noStagedChanges: 'No staged changes.',
    noFilesChanged: 'No files changed.',
    chooseExportTarget: 'Choose what to export',
    specificCommits: 'Specific Commits',
    recentCommits: 'Recent Commits',
    stagedChanges: 'Staged Changes',
    chooseNumCommits: 'How many recent commits to export?',
    chooseDiffMode: 'Choose diff mode',
    fullFileMode: 'Full File Mode',
    hunksOnlyMode: 'Hunks Only Mode',
    supervisorMode: 'Supervisor Mode',
    selectCommitsToExport: 'Select commits to export (Multi-select enabled)',
    processing: 'Processing {0}/{1}: {2}',
    completed: 'Completed',
    exportedFiles: '{0} Markdown files have been exported.',
    noChangesToExport: 'No changes to export.',
    yes: 'Yes',
    cancel: 'Cancel',
    exportComplete: 'Export completed',
    processingCommit: 'Processing commit {0}'
  },
  ko: {
    noWorkspaceFolder: 'Git 저장소가 있는 폴더를 먼저 열어주세요.',
    notGitRepo: 'Git 저장소가 아닙니다. Git이 초기화된 프로젝트에서 사용해주세요.',
    cannotGetCommitList: '커밋 목록을 가져올 수 없습니다: {0}',
    cannotGetCommitInfo: '커밋 정보를 가져올 수 없습니다: {0}',
    noChangedFiles: '변경된 파일이 없습니다.',
    noStagedChanges: '스테이지된 변경사항이 없습니다.',
    noFilesChanged: '변경된 파일이 없습니다.',
    chooseExportTarget: '내보낼 대상을 선택하세요',
    specificCommits: '특정 커밋',
    recentCommits: '최근 커밋',
    stagedChanges: '스테이지된 변경사항',
    chooseNumCommits: '몇 개의 최근 커밋을 내보낼까요?',
    chooseDiffMode: 'diff 모드를 선택하세요',
    fullFileMode: '전체 파일 모드',
    hunksOnlyMode: '변경 부분만',
    supervisorMode: '수퍼바이저 모드',
    selectCommitsToExport: '내보낼 커밋을 선택하세요 (다중 선택 가능)',
    processing: '{0}/{1} 처리 중: {2}',
    completed: '완료',
    exportedFiles: '{0}개의 마크다운 파일이 내보내졌습니다.',
    noChangesToExport: '내보낼 변경사항이 없습니다.',
    yes: '네',
    cancel: '취소',
    exportComplete: '내보내기 완료',
    processingCommit: '{0} 커밋 처리 중'
  }
} as const;

/**
 * Simple string interpolation helper
 * Replaces {0}, {1}, etc. with provided arguments
 */
export function t(language: 'en' | 'ko', key: keyof typeof MESSAGES.en, ...args: string[]): string {
  const messages = MESSAGES[language];
  let message: string = messages[key] || MESSAGES.en[key];
  
  // Simple string interpolation for {0}, {1}, etc.
  args.forEach((arg, index) => {
    message = message.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
  });
  
  return message;
}