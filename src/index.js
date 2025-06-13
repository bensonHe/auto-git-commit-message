const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const GitAnalyzer = require('./gitAnalyzer');
const AICommitGenerator = require('./aiCommitGenerator');
const ConfigManager = require('./configManager');

class GitAutoCommit {
    constructor(silent = false) {
        this.gitAnalyzer = new GitAnalyzer();
        this.configManager = new ConfigManager();
        this.aiGenerator = null;
        this.silent = silent;
    }

    /**
     * 初始化AI生成器
     */
    async initializeAI() {
        const config = await this.configManager.getConfig();
        
        if (!await this.configManager.isConfigured()) {
            if (!this.silent) {
                console.log(chalk.yellow('⚠️  配置未完成，请先配置API密钥'));
                await this.configManager.interactiveConfig();
                return this.initializeAI();
            } else {
                throw new Error('配置未完成');
            }
        }

        this.aiGenerator = new AICommitGenerator(config);
        
        // 验证API密钥
        if (!this.silent) {
            const spinner = ora('验证API密钥...').start();
            const isValid = await this.aiGenerator.validateApiKey();
            spinner.stop();
            
            if (!isValid) {
                console.log(chalk.red('❌ API密钥无效或网络连接失败'));
                const { reconfigure } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'reconfigure',
                        message: '是否重新配置?',
                        default: true
                    }
                ]);
                
                if (reconfigure) {
                    await this.configManager.interactiveConfig();
                    return this.initializeAI();
                } else {
                    process.exit(1);
                }
            }
            
            console.log(chalk.green('✓ AI配置验证成功'));
        } else {
            // 静默模式下只验证，不显示UI
            const isValid = await this.aiGenerator.validateApiKey();
            if (!isValid) {
                throw new Error('API密钥无效或网络连接失败');
            }
        }
    }

    /**
     * 生成提交信息
     */
    async generateCommitMessage() {
        try {
            // 检查是否在Git仓库中
            if (!await this.gitAnalyzer.isGitRepo()) {
                if (!this.silent) {
                    console.log(chalk.red('❌ 当前目录不是Git仓库'));
                }
                return null;
            }

            // 检查是否有变更
            const hasChanges = await this.gitAnalyzer.hasChanges();
            if (!hasChanges) {
                if (!this.silent) {
                    console.log(chalk.yellow('ℹ️  没有检测到Git变更'));
                }
                return null;
            }

            let spinner;
            if (!this.silent) {
                spinner = ora('分析代码变更...').start();
            }
            
            // 分析变更
            const diff = await this.gitAnalyzer.getDiff();
            const analysis = await this.gitAnalyzer.analyzeChanges();
            const recentCommits = await this.gitAnalyzer.getRecentCommits(5);
            
            if (!this.silent) {
                spinner.text = '生成提交信息...';
            }
            
            // 生成提交信息
            const commitMessage = await this.aiGenerator.generateCommitMessage(
                diff, 
                analysis, 
                recentCommits
            );
            
            if (!this.silent) {
                spinner.succeed('提交信息生成成功');
            }
            
            return commitMessage;

        } catch (error) {
            if (!this.silent) {
                console.error(chalk.red(`❌ 生成提交信息失败: ${error.message}`));
            }
            return null;
        }
    }

    /**
     * 生成多个提交信息选项
     */
    async generateMultipleOptions(count = 3) {
        try {
            if (!await this.gitAnalyzer.isGitRepo()) {
                console.log(chalk.red('❌ 当前目录不是Git仓库'));
                return [];
            }

            if (!await this.gitAnalyzer.hasChanges()) {
                console.log(chalk.yellow('ℹ️  没有检测到Git变更'));
                return [];
            }

            const spinner = ora('分析代码变更...').start();
            
            const diff = await this.gitAnalyzer.getDiff();
            const analysis = await this.gitAnalyzer.analyzeChanges();
            const recentCommits = await this.gitAnalyzer.getRecentCommits(5);
            
            spinner.text = `生成${count}个提交信息选项...`;
            
            const options = await this.aiGenerator.generateMultipleOptions(
                diff, 
                analysis, 
                recentCommits, 
                count
            );
            
            spinner.succeed(`成功生成${options.length}个提交信息选项`);
            
            return options;

        } catch (error) {
            console.error(chalk.red(`❌ 生成提交信息选项失败: ${error.message}`));
            return [];
        }
    }

    /**
     * 交互式提交
     */
    async interactiveCommit() {
        await this.initializeAI();
        
        console.log(chalk.cyan('🚀 Git Auto Commit - 智能提交信息生成'));
        
        const options = await this.generateMultipleOptions(3);
        if (options.length === 0) {
            return;
        }

        // 显示选项
        console.log(chalk.blue('\n📝 AI生成的提交信息选项:'));
        options.forEach((option, index) => {
            console.log(chalk.gray(`${index + 1}. ${option}`));
        });

        const choices = [
            ...options.map((option, index) => ({ name: option, value: option })),
            { name: '📝 自定义提交信息', value: 'custom' },
            { name: '🔄 重新生成', value: 'regenerate' },
            { name: '❌ 取消', value: 'cancel' }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '请选择操作:',
                choices: choices
            }
        ]);

        if (action === 'cancel') {
            console.log(chalk.gray('操作已取消'));
            return;
        }

        if (action === 'regenerate') {
            return await this.interactiveCommit();
        }

        let commitMessage = action;
        
        if (action === 'custom') {
            const { customMessage } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'customMessage',
                    message: '输入提交信息:',
                    validate: (input) => input.trim() ? true : '提交信息不能为空'
                }
            ]);
            commitMessage = customMessage;
        }

        // 确认提交
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `确认提交? "${commitMessage}"`,
                default: true
            }
        ]);

        if (confirm) {
            const spinner = ora('提交中...').start();
            try {
                await this.gitAnalyzer.commitChanges(commitMessage);
                spinner.succeed(chalk.green('✓ 提交成功!'));
            } catch (error) {
                spinner.fail(chalk.red(`❌ 提交失败: ${error.message}`));
            }
        } else {
            console.log(chalk.gray('提交已取消'));
        }
    }

    /**
     * 显示Git状态摘要
     */
    async showStatusSummary() {
        try {
            if (!await this.gitAnalyzer.isGitRepo()) {
                console.log(chalk.red('❌ 当前目录不是Git仓库'));
                return;
            }

            console.log(chalk.cyan('📊 Git 状态摘要'));
            
            const status = await this.gitAnalyzer.getStatus();
            const analysis = await this.gitAnalyzer.analyzeChanges();
            
            console.log(chalk.blue('\n📁 变更文件:'));
            status.files.forEach(file => {
                const statusColor = file.working_dir === 'M' ? 'yellow' : 
                                   file.working_dir === 'A' ? 'green' : 
                                   file.working_dir === 'D' ? 'red' : 'gray';
                console.log(chalk[statusColor](`  ${file.working_dir} ${file.path}`));
            });

            console.log(chalk.blue('\n📈 统计信息:'));
            console.log(`  文件数量: ${analysis.stats.filesChanged}`);
            console.log(`  新增行数: ${chalk.green(analysis.stats.additions)}`);
            console.log(`  删除行数: ${chalk.red(analysis.stats.deletions)}`);
            console.log(`  变更类型: ${analysis.type}`);
            if (analysis.scope) {
                console.log(`  作用域: ${analysis.scope}`);
            }

        } catch (error) {
            console.error(chalk.red(`❌ 获取状态失败: ${error.message}`));
        }
    }
}

module.exports = GitAutoCommit; 