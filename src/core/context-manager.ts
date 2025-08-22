/**
 * Context Manager - Manages analysis history and context for supervisor AI
 * 
 * Provides contextual information from previous analyses to help the supervisor AI
 * make better decisions by understanding patterns and relationships between commits.
 */

import { AnalysisResult, ContextQuery, ContextResult } from './types';

interface ContextManagerConfig {
  maxHistorySize: number;          // Maximum number of analyses to keep
  maxContextAge: number;           // Maximum age in milliseconds (default: 30 days)
  relevanceThreshold: number;      // Minimum relevance score to include (0-1)
  enableFileSimilarity: boolean;   // Enable file-based similarity matching
  enableTimeSimilarity: boolean;   // Enable time-based similarity matching
  enableAuthorSimilarity: boolean; // Enable author-based similarity matching
}

const DEFAULT_CONFIG: ContextManagerConfig = {
  maxHistorySize: 1000,
  maxContextAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  relevanceThreshold: 0.1,
  enableFileSimilarity: true,
  enableTimeSimilarity: true,
  enableAuthorSimilarity: true
};

export class ContextManager {
  private analyses: Map<string, AnalysisResult> = new Map();
  private fileIndex: Map<string, Set<string>> = new Map(); // file -> commit hashes
  private authorIndex: Map<string, Set<string>> = new Map(); // author -> commit hashes
  private timeIndex: Map<number, string> = new Map(); // timestamp -> commit hash
  private config: ContextManagerConfig;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a new analysis result to the context
   */
  async addAnalysis(analysis: AnalysisResult): Promise<void> {
    // Store the analysis
    this.analyses.set(analysis.commitHash, analysis);

    // Update file index
    for (const file of analysis.files) {
      if (!this.fileIndex.has(file)) {
        this.fileIndex.set(file, new Set());
      }
      this.fileIndex.get(file)!.add(analysis.commitHash);
    }

    // Update author index
    if (!this.authorIndex.has(analysis.author)) {
      this.authorIndex.set(analysis.author, new Set());
    }
    this.authorIndex.get(analysis.author)!.add(analysis.commitHash);

    // Update time index
    this.timeIndex.set(analysis.timestamp, analysis.commitHash);

    // Prune old analyses if needed
    await this.pruneOldContext();
  }

  /**
   * Get related context for a given commit hash
   */
  async getRelatedContext(commitHash: string): Promise<ContextResult> {
    const analysis = this.analyses.get(commitHash);
    if (!analysis) {
      return {
        results: [],
        totalCount: 0,
        relevanceScore: 0,
        summary: 'No context available for this commit.'
      };
    }

    // Find related analyses
    const relatedHashes = new Set<string>();
    const relevanceScores = new Map<string, number>();

    // File-based similarity
    if (this.config.enableFileSimilarity) {
      for (const file of analysis.files) {
        const fileCommits = this.fileIndex.get(file);
        if (fileCommits) {
          for (const hash of fileCommits) {
            if (hash !== commitHash) {
              relatedHashes.add(hash);
              relevanceScores.set(hash, (relevanceScores.get(hash) || 0) + 0.4);
            }
          }
        }
      }
    }

    // Time-based similarity (commits within 7 days)
    if (this.config.enableTimeSimilarity) {
      const timeWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
      for (const [timestamp, hash] of this.timeIndex) {
        if (hash !== commitHash && 
            Math.abs(timestamp - analysis.timestamp) < timeWindow) {
          relatedHashes.add(hash);
          const timeDiff = Math.abs(timestamp - analysis.timestamp);
          const timeScore = Math.max(0, 1 - (timeDiff / timeWindow)) * 0.3;
          relevanceScores.set(hash, (relevanceScores.get(hash) || 0) + timeScore);
        }
      }
    }

    // Author-based similarity
    if (this.config.enableAuthorSimilarity) {
      const authorCommits = this.authorIndex.get(analysis.author);
      if (authorCommits) {
        for (const hash of authorCommits) {
          if (hash !== commitHash) {
            relatedHashes.add(hash);
            relevanceScores.set(hash, (relevanceScores.get(hash) || 0) + 0.2);
          }
        }
      }
    }

    // Risk-level similarity
    for (const [hash, otherAnalysis] of this.analyses) {
      if (hash !== commitHash && otherAnalysis.riskLevel === analysis.riskLevel) {
        relatedHashes.add(hash);
        relevanceScores.set(hash, (relevanceScores.get(hash) || 0) + 0.1);
      }
    }

    // Convert to results and sort by relevance
    const results = Array.from(relatedHashes)
      .map(hash => ({
        analysis: this.analyses.get(hash)!,
        relevance: relevanceScores.get(hash) || 0
      }))
      .filter(item => item.relevance >= this.config.relevanceThreshold)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10) // Limit to top 10
      .map(item => item.analysis);

    // Calculate overall relevance score
    const maxPossibleScore = 1.0; // 0.4 + 0.3 + 0.2 + 0.1
    const avgRelevance = results.length > 0 
      ? Array.from(relevanceScores.values()).reduce((sum, score) => sum + score, 0) / results.length / maxPossibleScore
      : 0;

    return {
      results,
      totalCount: results.length,
      relevanceScore: Math.min(1, avgRelevance),
      summary: this.generateContextSummary(analysis, results)
    };
  }

  /**
   * Query context based on criteria
   */
  async queryContext(query: ContextQuery): Promise<ContextResult> {
    let results = Array.from(this.analyses.values());

    // Apply filters
    if (query.commitHash) {
      results = results.filter(a => a.commitHash === query.commitHash);
    }

    if (query.files && query.files.length > 0) {
      results = results.filter(a => 
        query.files!.some(file => a.files.includes(file))
      );
    }

    if (query.timeRange) {
      results = results.filter(a => 
        a.timestamp >= query.timeRange!.from && 
        a.timestamp <= query.timeRange!.to
      );
    }

    if (query.riskLevel && query.riskLevel.length > 0) {
      results = results.filter(a => query.riskLevel!.includes(a.riskLevel));
    }

    if (query.author) {
      results = results.filter(a => a.author === query.author);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return {
      results,
      totalCount: results.length,
      relevanceScore: results.length > 0 ? 0.8 : 0, // High relevance for direct queries
      summary: `Found ${results.length} analyses matching the query criteria.`
    };
  }

  /**
   * Prune old context entries
   */
  async pruneOldContext(): Promise<void> {
    const now = Date.now();
    const maxAge = this.config.maxContextAge;
    const toDelete: string[] = [];

    // Find analyses to delete (too old or exceeding size limit)
    for (const [hash, analysis] of this.analyses) {
      if (now - analysis.timestamp > maxAge) {
        toDelete.push(hash);
      }
    }

    // If still over size limit, delete oldest
    const totalCount = this.analyses.size - toDelete.length;
    if (totalCount > this.config.maxHistorySize) {
      const sortedAnalyses = Array.from(this.analyses.values())
        .filter(a => !toDelete.includes(a.commitHash))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const excess = totalCount - this.config.maxHistorySize;
      for (let i = 0; i < excess; i++) {
        toDelete.push(sortedAnalyses[i].commitHash);
      }
    }

    // Delete selected analyses and update indices
    for (const hash of toDelete) {
      const analysis = this.analyses.get(hash);
      if (analysis) {
        // Remove from main storage
        this.analyses.delete(hash);

        // Remove from file index
        for (const file of analysis.files) {
          const fileCommits = this.fileIndex.get(file);
          if (fileCommits) {
            fileCommits.delete(hash);
            if (fileCommits.size === 0) {
              this.fileIndex.delete(file);
            }
          }
        }

        // Remove from author index
        const authorCommits = this.authorIndex.get(analysis.author);
        if (authorCommits) {
          authorCommits.delete(hash);
          if (authorCommits.size === 0) {
            this.authorIndex.delete(analysis.author);
          }
        }

        // Remove from time index
        this.timeIndex.delete(analysis.timestamp);
      }
    }
  }

  /**
   * Get context statistics
   */
  getStats(): {
    totalAnalyses: number;
    uniqueFiles: number;
    uniqueAuthors: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    const timestamps = Array.from(this.timeIndex.keys());
    return {
      totalAnalyses: this.analyses.size,
      uniqueFiles: this.fileIndex.size,
      uniqueAuthors: this.authorIndex.size,
      oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.analyses.clear();
    this.fileIndex.clear();
    this.authorIndex.clear();
    this.timeIndex.clear();
  }

  /**
   * Export context data for backup or sharing
   */
  exportContext(): AnalysisResult[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Import context data from backup
   */
  async importContext(analyses: AnalysisResult[]): Promise<void> {
    this.clear();
    for (const analysis of analyses) {
      await this.addAnalysis(analysis);
    }
  }

  // Private helper methods

  private generateContextSummary(currentAnalysis: AnalysisResult, relatedAnalyses: AnalysisResult[]): string {
    if (relatedAnalyses.length === 0) {
      return `No related context found for commit ${currentAnalysis.commitHash.substring(0, 8)}.`;
    }

    const fileOverlaps = this.countFileOverlaps(currentAnalysis, relatedAnalyses);
    const riskPatterns = this.analyzeRiskPatterns(relatedAnalyses);
    const authorHistory = this.analyzeAuthorHistory(currentAnalysis.author, relatedAnalyses);

    let summary = `Found ${relatedAnalyses.length} related analyses for commit ${currentAnalysis.commitHash.substring(0, 8)}.\n`;
    
    if (fileOverlaps > 0) {
      summary += `• ${fileOverlaps} related commits modified the same files\n`;
    }
    
    if (riskPatterns.high > 0) {
      summary += `• Warning: ${riskPatterns.high} recent high-risk changes detected\n`;
    }
    
    if (authorHistory.recentCommits > 0) {
      summary += `• Author has ${authorHistory.recentCommits} recent commits with avg risk: ${authorHistory.avgRisk}\n`;
    }

    return summary.trim();
  }

  private countFileOverlaps(current: AnalysisResult, related: AnalysisResult[]): number {
    return related.filter(analysis => 
      analysis.files.some(file => current.files.includes(file))
    ).length;
  }

  private analyzeRiskPatterns(analyses: AnalysisResult[]): { high: number; medium: number; low: number } {
    const patterns = { high: 0, medium: 0, low: 0 };
    for (const analysis of analyses) {
      if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
        patterns.high++;
      } else if (analysis.riskLevel === 'medium') {
        patterns.medium++;
      } else {
        patterns.low++;
      }
    }
    return patterns;
  }

  private analyzeAuthorHistory(author: string, analyses: AnalysisResult[]): { recentCommits: number; avgRisk: string } {
    const authorAnalyses = analyses.filter(a => a.author === author);
    const recentCommits = authorAnalyses.length;
    
    if (recentCommits === 0) {
      return { recentCommits: 0, avgRisk: 'unknown' };
    }

    const riskScores = authorAnalyses.map(a => a.riskScore);
    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    let avgRisk = 'low';
    if (avgRiskScore > 70) {avgRisk = 'high';}
    else if (avgRiskScore > 40) {avgRisk = 'medium';}

    return { recentCommits, avgRisk };
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
export default ContextManager;