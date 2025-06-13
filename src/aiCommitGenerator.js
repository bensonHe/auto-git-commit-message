const OpenAI = require('openai');
const DashScopeGenerator = require('./dashscopeGenerator');

class AICommitGenerator {
    constructor(config = {}) {
        this.config = config;
        this.setupGenerator();
    }

    /**
     * 根据配置设置相应的生成器
     */
    setupGenerator() {
        if (this.config.aiProvider === 'dashscope') {
            this.generator = new DashScopeGenerator(this.config.dashscopeApiKey, {
                model: this.config.model || 'qwen-turbo',
                language: this.config.language || 'zh-CN',
                style: this.config.style || 'conventional',
                maxTokens: this.config.maxTokens || 100,
                temperature: this.config.temperature || 0.3
            });
        } else {
            // OpenAI generator
            this.openai = new OpenAI({
                apiKey: this.config.openaiApiKey || process.env.OPENAI_API_KEY,
            });
        }
    }

    /**
     * 生成提交信息
     */
    async generateCommitMessage(diff, analysis, recentCommits = []) {
        if (this.config.aiProvider === 'dashscope') {
            return await this.generator.generateCommitMessage(diff, analysis, recentCommits);
        } else {
            return await this.generateWithOpenAI(diff, analysis, recentCommits);
        }
    }

    /**
     * OpenAI生成方法
     */
    async generateWithOpenAI(diff, analysis, recentCommits) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: this.getOpenAISystemPrompt()
                },
                {
                    role: 'user',
                    content: this.buildOpenAIPrompt(diff, analysis, recentCommits)
                }
            ];

            const response = await this.openai.chat.completions.create({
                model: this.config.model || 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: this.config.maxTokens || 100,
                temperature: this.config.temperature || 0.3
            });

            if (response.choices && response.choices.length > 0) {
                const commitMessage = response.choices[0].message.content.trim();
                return this.formatCommitMessage(commitMessage, analysis);
            } else {
                throw new Error('无效的OpenAI API响应');
            }

        } catch (error) {
            if (error.code === 'insufficient_quota') {
                throw new Error('OpenAI API配额不足，请检查账户余额');
            } else if (error.code === 'invalid_api_key') {
                throw new Error('无效的OpenAI API密钥');
            }
            throw new Error(`OpenAI API错误: ${error.message}`);
        }
    }

    /**
     * OpenAI系统提示词
     */
    getOpenAISystemPrompt() {
        const language = this.config.language === 'zh-CN' ? '中文' : 'English';
        
        return `You are a professional Git commit message generator. Your task is to:

1. Analyze code changes
2. Understand the purpose and impact of changes
3. Generate concise, accurate commit messages
4. Follow best practices and conventions

Requirements:
- Commit messages should be concise and clear
- Use ${language}
- Avoid excessive technical details
- Highlight the main purpose of changes
- Maintain consistent style

${this.config.style === 'conventional' ? 
`Please strictly follow Conventional Commits format:
- feat: new features
- fix: bug fixes
- docs: documentation changes
- style: code formatting
- refactor: refactoring
- test: test related
- chore: other miscellaneous` : ''}`;
    }

    /**
     * 构建OpenAI提示词
     */
    buildOpenAIPrompt(diff, analysis, recentCommits) {
        const language = this.config.language === 'zh-CN' ? '中文' : 'English';
        
        let prompt = `Please analyze the following Git changes and generate an appropriate commit message:

**Change Statistics:**
- Files changed: ${analysis.stats.filesChanged}
- Lines added: ${analysis.stats.additions}
- Lines deleted: ${analysis.stats.deletions}

**Changed Files:**
${analysis.files.map(file => `- ${file}`).join('\n')}

**Change Type:** ${analysis.type}
**Scope:** ${analysis.scope || 'none'}

**Recent Commit History:**
${recentCommits.map(commit => `- ${commit.message}`).join('\n')}

**Code Diff:**
\`\`\`diff
${this.truncateDiff(diff)}
\`\`\`

Please generate a clear, concise commit message in ${language}.`;

        if (this.config.style === 'conventional') {
            prompt += `

Please follow Conventional Commits format:
- Format: type(scope): description
- Type can be: feat, fix, docs, style, refactor, test, chore
- Description should be concise, no more than 50 characters
- Use ${language} for description`;
        }

        return prompt;
    }

    /**
     * 格式化提交信息
     */
    formatCommitMessage(message, analysis) {
        // 如果AI返回的信息已经是规范格式，直接返回
        if (this.isConventionalFormat(message)) {
            return message;
        }

        // 否则格式化为Conventional Commits格式
        if (this.config.style === 'conventional') {
            const scope = analysis.scope ? `(${analysis.scope})` : '';
            return `${analysis.type}${scope}: ${message}`;
        }

        return message;
    }

    /**
     * 检查是否是Conventional Commits格式
     */
    isConventionalFormat(message) {
        const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
        return conventionalPattern.test(message);
    }

    /**
     * 截断过长的diff内容
     */
    truncateDiff(diff, maxLines = 50) {
        if (!diff) return '';
        
        const lines = diff.split('\n');
        if (lines.length <= maxLines) {
            return diff;
        }

        return lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
    }

    /**
     * 生成多个候选提交信息
     */
    async generateMultipleOptions(diff, analysis, recentCommits = [], count = 3) {
        if (this.config.aiProvider === 'dashscope') {
            return await this.generator.generateMultipleOptions(diff, analysis, recentCommits, count);
        } else {
            const promises = Array(count).fill().map(() => 
                this.generateWithOpenAI(diff, analysis, recentCommits)
            );

            try {
                const results = await Promise.all(promises);
                return [...new Set(results)]; // 去重
            } catch (error) {
                throw new Error(`生成多个提交信息选项失败: ${error.message}`);
            }
        }
    }

    /**
     * 验证API密钥
     */
    async validateApiKey() {
        if (this.config.aiProvider === 'dashscope') {
            return await this.generator.validateApiKey();
        } else {
            try {
                await this.openai.chat.completions.create({
                    model: this.config.model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                });
                return true;
            } catch (error) {
                return false;
            }
        }
    }
}

module.exports = AICommitGenerator; 