const axios = require('axios');

class DashScopeGenerator {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey || process.env.DASHSCOPE_API_KEY;
        this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        
        this.options = {
            model: options.model || 'qwen-turbo',
            language: options.language || 'zh-CN',
            style: options.style || 'conventional',
            maxTokens: options.maxTokens || 100,
            temperature: options.temperature || 0.3
        };
    }

    /**
     * 生成提交信息
     */
    async generateCommitMessage(diff, analysis, recentCommits = []) {
        try {
            const prompt = this.buildPrompt(diff, analysis, recentCommits);
            
            const response = await axios.post(this.baseURL, {
                model: this.options.model,
                input: {
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                parameters: {
                    max_tokens: this.options.maxTokens,
                    temperature: this.options.temperature,
                    result_format: 'message'
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.output && response.data.output.choices && response.data.output.choices.length > 0) {
                const commitMessage = response.data.output.choices[0].message.content.trim();
                return this.formatCommitMessage(commitMessage, analysis);
            } else {
                throw new Error('无效的API响应格式');
            }
            
        } catch (error) {
            if (error.response) {
                throw new Error(`百炼API错误: ${error.response.data.message || error.response.statusText}`);
            }
            throw new Error(`AI生成提交信息失败: ${error.message}`);
        }
    }

    /**
     * 构建提示词
     */
    buildPrompt(diff, analysis, recentCommits) {
        const language = this.options.language === 'zh-CN' ? '中文' : 'English';
        
        let prompt = `请分析以下Git变更并生成合适的提交信息：

**变更统计:**
- 文件数量: ${analysis.stats.filesChanged}
- 新增行数: ${analysis.stats.additions}
- 删除行数: ${analysis.stats.deletions}

**变更文件:**
${analysis.files.map(file => `- ${file}`).join('\n')}

**变更类型:** ${analysis.type}
**作用域:** ${analysis.scope || '无'}

**最近提交历史:**
${recentCommits.map(commit => `- ${commit.message}`).join('\n')}

**代码差异:**
\`\`\`diff
${this.truncateDiff(diff)}
\`\`\`

请用${language}生成一个清晰、简洁的提交信息。`;

        if (this.options.style === 'conventional') {
            prompt += `

请遵循Conventional Commits规范:
- 格式: type(scope): description
- type可以是: feat, fix, docs, style, refactor, test, chore
- 描述要简洁明了，不超过50个字符
- 如果是中文，请使用中文描述`;
        }

        return prompt;
    }

    /**
     * 获取系统提示词
     */
    getSystemPrompt() {
        const language = this.options.language === 'zh-CN' ? '中文' : 'English';
        
        return `你是一个专业的Git提交信息生成助手。你的任务是：

1. 分析代码变更内容
2. 理解变更的目的和影响
3. 生成简洁、准确的提交信息
4. 遵循最佳实践和约定

要求：
- 提交信息要简洁明了
- 使用${language}
- 避免技术细节过多
- 突出变更的主要目的
- 保持一致的风格

${this.options.style === 'conventional' ? 
`请严格遵循Conventional Commits规范：
- feat: 新功能
- fix: 修复bug
- docs: 文档变更
- style: 代码格式化
- refactor: 重构
- test: 测试相关
- chore: 其他杂项` : ''}`;
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
        if (this.options.style === 'conventional') {
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
        const promises = Array(count).fill().map(() => 
            this.generateCommitMessage(diff, analysis, recentCommits)
        );

        try {
            const results = await Promise.all(promises);
            return [...new Set(results)]; // 去重
        } catch (error) {
            throw new Error(`生成多个提交信息选项失败: ${error.message}`);
        }
    }

    /**
     * 验证API密钥
     */
    async validateApiKey() {
        try {
            const response = await axios.post(this.baseURL, {
                model: this.options.model,
                input: {
                    messages: [
                        { 
                            role: 'user', 
                            content: 'test' 
                        }
                    ]
                },
                parameters: {
                    max_tokens: 1
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = DashScopeGenerator; 