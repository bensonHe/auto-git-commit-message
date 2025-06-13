const simpleGit = require('simple-git');
const path = require('path');

class GitAnalyzer {
    constructor(repoPath = process.cwd()) {
        this.git = simpleGit(repoPath);
        this.repoPath = repoPath;
    }

    /**
     * 获取暂存区的变更内容
     */
    async getStagedDiff() {
        try {
            const diff = await this.git.diff(['--staged']);
            return diff;
        } catch (error) {
            throw new Error(`获取暂存区差异失败: ${error.message}`);
        }
    }

    /**
     * 获取工作区的变更内容
     */
    async getWorkingDiff() {
        try {
            const diff = await this.git.diff();
            return diff;
        } catch (error) {
            throw new Error(`获取工作区差异失败: ${error.message}`);
        }
    }

    /**
     * 获取变更的文件列表
     */
    async getChangedFiles() {
        try {
            const status = await this.git.status();
            return {
                staged: status.staged,
                modified: status.modified,
                created: status.created,
                deleted: status.deleted,
                renamed: status.renamed
            };
        } catch (error) {
            throw new Error(`获取文件状态失败: ${error.message}`);
        }
    }

    /**
     * 获取最近的提交历史
     */
    async getRecentCommits(count = 5) {
        try {
            const log = await this.git.log(['--oneline', `-${count}`]);
            return log.all.map(commit => ({
                hash: commit.hash,
                message: commit.message,
                date: commit.date
            }));
        } catch (error) {
            throw new Error(`获取提交历史失败: ${error.message}`);
        }
    }

    /**
     * 分析变更类型
     */
    async analyzeChanges() {
        const changes = await this.getChangedFiles();
        const diff = await this.getStagedDiff() || await this.getWorkingDiff();
        
        let analysis = {
            type: 'chore',
            scope: '',
            files: [],
            stats: {
                additions: 0,
                deletions: 0,
                filesChanged: 0
            }
        };

        // 统计文件变更
        const allChangedFiles = [
            ...changes.staged,
            ...changes.modified,
            ...changes.created,
            ...changes.deleted
        ];

        analysis.files = [...new Set(allChangedFiles)];
        analysis.stats.filesChanged = analysis.files.length;

        // 从diff中提取统计信息
        if (diff) {
            const lines = diff.split('\n');
            analysis.stats.additions = lines.filter(line => line.startsWith('+')).length;
            analysis.stats.deletions = lines.filter(line => line.startsWith('-')).length;
        }

        // 分析变更类型
        if (changes.created.length > 0) {
            analysis.type = 'feat';
        } else if (changes.deleted.length > 0) {
            analysis.type = 'feat';
        } else if (analysis.files.some(file => file.includes('test'))) {
            analysis.type = 'test';
        } else if (analysis.files.some(file => file.includes('doc') || file.includes('README'))) {
            analysis.type = 'docs';
        } else if (analysis.files.some(file => file.includes('config') || file.includes('package.json'))) {
            analysis.type = 'chore';
        } else {
            analysis.type = 'feat';
        }

        // 确定作用域
        const commonPaths = analysis.files.map(file => {
            const parts = file.split('/');
            return parts.length > 1 ? parts[0] : '';
        });
        
        const scopeCounts = {};
        commonPaths.forEach(scope => {
            if (scope) {
                scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
            }
        });

        if (Object.keys(scopeCounts).length > 0) {
            analysis.scope = Object.keys(scopeCounts).reduce((a, b) => 
                scopeCounts[a] > scopeCounts[b] ? a : b
            );
        }

        return analysis;
    }

    /**
     * 检查是否在Git仓库中
     */
    async isGitRepo() {
        try {
            await this.git.status();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取当前分支名
     */
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current;
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * 检查是否有变更
     */
    async hasChanges() {
        try {
            const status = await this.git.status();
            return status.files.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取diff内容（优先暂存区，否则工作区）
     */
    async getDiff() {
        try {
            const stagedDiff = await this.getStagedDiff();
            if (stagedDiff && stagedDiff.trim()) {
                return stagedDiff;
            }
            return await this.getWorkingDiff();
        } catch (error) {
            throw new Error(`获取diff失败: ${error.message}`);
        }
    }

    /**
     * 获取Git状态
     */
    async getStatus() {
        try {
            return await this.git.status();
        } catch (error) {
            throw new Error(`获取Git状态失败: ${error.message}`);
        }
    }

    /**
     * 提交变更
     */
    async commitChanges(message) {
        try {
            // 检查是否有暂存的文件
            const status = await this.git.status();
            if (status.staged.length === 0 && status.files.length > 0) {
                // 如果没有暂存文件但有变更，先暂存所有文件
                await this.git.add('.');
            }
            
            await this.git.commit(message);
            return true;
        } catch (error) {
            throw new Error(`提交失败: ${error.message}`);
        }
    }
}

module.exports = GitAnalyzer; 