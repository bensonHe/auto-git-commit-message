const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ConfigManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.git-auto-commit');
        this.configFile = path.join(this.configDir, 'config.json');
        this.defaultConfig = {
            // AI提供商配置
            aiProvider: 'dashscope', // 'openai' 或 'dashscope'
            
            // OpenAI配置
            openaiApiKey: '',
            
            // 百炼大模型配置
            dashscopeApiKey: 'sk-17aad991a26a444d96bbbe5953559187',
            
            // 通用配置
            model: 'qwen-turbo',
            language: 'zh-CN',
            style: 'conventional',
            maxTokens: 100,
            temperature: 0.3
        };
    }

    /**
     * 确保配置目录存在
     */
    async ensureConfigDir() {
        try {
            await fs.access(this.configDir);
        } catch {
            await fs.mkdir(this.configDir, { recursive: true });
        }
    }

    /**
     * 获取配置
     */
    async getConfig() {
        try {
            await this.ensureConfigDir();
            const configData = await fs.readFile(this.configFile, 'utf8');
            const config = JSON.parse(configData);
            return { ...this.defaultConfig, ...config };
        } catch {
            return { ...this.defaultConfig };
        }
    }

    /**
     * 保存配置
     */
    async saveConfig(config) {
        try {
            await this.ensureConfigDir();
            const currentConfig = await this.getConfig();
            const newConfig = { ...currentConfig, ...config };
            await fs.writeFile(this.configFile, JSON.stringify(newConfig, null, 2));
            return newConfig;
        } catch (error) {
            throw new Error(`保存配置失败: ${error.message}`);
        }
    }

    /**
     * 设置AI提供商
     */
    async setAiProvider(provider) {
        return await this.saveConfig({ aiProvider: provider });
    }

    /**
     * 设置OpenAI API密钥
     */
    async setOpenAiApiKey(apiKey) {
        return await this.saveConfig({ openaiApiKey: apiKey });
    }

    /**
     * 设置百炼API密钥
     */
    async setDashScopeApiKey(apiKey) {
        return await this.saveConfig({ dashscopeApiKey: apiKey });
    }

    /**
     * 设置模型
     */
    async setModel(model) {
        return await this.saveConfig({ model });
    }

    /**
     * 设置语言
     */
    async setLanguage(language) {
        return await this.saveConfig({ language });
    }

    /**
     * 设置提交风格
     */
    async setStyle(style) {
        return await this.saveConfig({ style });
    }

    /**
     * 重置配置
     */
    async resetConfig() {
        return await this.saveConfig(this.defaultConfig);
    }

    /**
     * 删除配置文件
     */
    async deleteConfig() {
        try {
            await fs.unlink(this.configFile);
        } catch (error) {
            // 文件不存在时忽略错误
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * 检查配置是否完整
     */
    async isConfigured() {
        const config = await this.getConfig();
        if (config.aiProvider === 'openai') {
            return !!config.openaiApiKey;
        } else if (config.aiProvider === 'dashscope') {
            return !!config.dashscopeApiKey;
        }
        return false;
    }

    /**
     * 获取配置文件路径
     */
    getConfigPath() {
        return this.configFile;
    }

    /**
     * 获取百炼模型选项
     */
    getDashScopeModelOptions() {
        return [
            { name: 'Qwen-Turbo (推荐，速度快)', value: 'qwen-turbo' },
            { name: 'Qwen-Plus (平衡性能)', value: 'qwen-plus' },
            { name: 'Qwen-Max (最高质量)', value: 'qwen-max' },
            { name: 'Qwen-Max-1201', value: 'qwen-max-1201' },
            { name: 'Qwen-Max-LongContext', value: 'qwen-max-longcontext' }
        ];
    }

    /**
     * 获取OpenAI模型选项
     */
    getOpenAiModelOptions() {
        return [
            { name: 'GPT-3.5 Turbo (推荐)', value: 'gpt-3.5-turbo' },
            { name: 'GPT-4', value: 'gpt-4' },
            { name: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' }
        ];
    }

    /**
     * 交互式配置
     */
    async interactiveConfig() {
        const inquirer = require('inquirer');
        const chalk = require('chalk');

        console.log(chalk.cyan('🔧 Git Auto Commit 配置向导'));

        const config = await this.getConfig();

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'aiProvider',
                message: '选择AI提供商:',
                choices: [
                    { name: '百炼大模型 (阿里云通义千问) - 推荐', value: 'dashscope' },
                    { name: 'OpenAI GPT', value: 'openai' }
                ],
                default: config.aiProvider
            },
            {
                type: 'password',
                name: 'dashscopeApiKey',
                message: '百炼API密钥:',
                default: config.dashscopeApiKey,
                when: (answers) => answers.aiProvider === 'dashscope',
                validate: (input) => input.trim() ? true : 'API密钥不能为空'
            },
            {
                type: 'password',
                name: 'openaiApiKey',
                message: 'OpenAI API密钥:',
                default: config.openaiApiKey,
                when: (answers) => answers.aiProvider === 'openai',
                validate: (input) => input.trim() ? true : 'API密钥不能为空'
            },
            {
                type: 'list',
                name: 'model',
                message: '选择AI模型:',
                choices: (answers) => {
                    if (answers.aiProvider === 'dashscope') {
                        return this.getDashScopeModelOptions();
                    } else {
                        return this.getOpenAiModelOptions();
                    }
                },
                default: config.model
            },
            {
                type: 'list',
                name: 'language',
                message: '选择语言:',
                choices: [
                    { name: '中文', value: 'zh-CN' },
                    { name: 'English', value: 'en' }
                ],
                default: config.language
            },
            {
                type: 'list',
                name: 'style',
                message: '选择提交信息风格:',
                choices: [
                    { name: 'Conventional Commits (推荐)', value: 'conventional' },
                    { name: '自由格式', value: 'free' }
                ],
                default: config.style
            },
            {
                type: 'number',
                name: 'maxTokens',
                message: '最大令牌数:',
                default: config.maxTokens,
                validate: (input) => input > 0 && input <= 500 ? true : '请输入1-500之间的数字'
            },
            {
                type: 'number',
                name: 'temperature',
                message: '创造性程度 (0-1):',
                default: config.temperature,
                validate: (input) => input >= 0 && input <= 1 ? true : '请输入0-1之间的数字'
            }
        ]);

        await this.saveConfig(answers);
        console.log(chalk.green('✓ 配置已保存'));
        
        return answers;
    }
}

module.exports = ConfigManager; 