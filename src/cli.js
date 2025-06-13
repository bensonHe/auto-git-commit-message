#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const GitAutoCommit = require('./index');
const ConfigManager = require('./configManager');
const GitHooks = require('./gitHooks');
const package = require('../package.json');

const program = new Command();

program
    .name('gac')
    .description('Git Auto Commit - AI智能提交信息生成工具')
    .version(package.version);

// 主要命令：交互式提交
program
    .command('commit', { isDefault: true })
    .alias('c')
    .description('交互式AI提交 (默认命令)')
    .option('-a, --add', '暂存所有变更')
    .option('-p, --push', '提交后推送到远程仓库')
    .option('-m, --message <message>', '直接指定提交信息')
    .action(async (options) => {
        const spinner = ora();
        
        try {
            const gitAutoCommit = new GitAutoCommit();

            if (options.message) {
                // 直接提交指定的信息
                spinner.start('正在提交...');
                await gitAutoCommit.commit(options.message, {
                    addAll: options.add,
                    push: options.push
                });
                spinner.succeed('提交完成!');
            } else {
                // 交互式提交
                await gitAutoCommit.interactiveCommit();
            }

        } catch (error) {
            spinner.fail(`提交失败: ${error.message}`);
            process.exit(1);
        }
    });

// 生成提交信息（不提交）
program
    .command('generate')
    .alias('gen')
    .description('生成提交信息')
    .option('-m, --multiple', '生成多个选项')
    .option('-c, --count <number>', '生成选项数量', '3')
    .option('--hook', '钩子模式（仅输出提交信息，不显示其他内容）')
    .action(async (options) => {
        const gitAutoCommit = new GitAutoCommit();
        
        // 钩子模式：静默初始化，只输出提交信息
        if (options.hook) {
            try {
                const silentGitAutoCommit = new GitAutoCommit(true); // 启用静默模式
                await silentGitAutoCommit.initializeAI();
                const message = await silentGitAutoCommit.generateCommitMessage();
                if (message) {
                    console.log(message); // 只输出提交信息，供钩子使用
                    process.exit(0);
                } else {
                    process.exit(1);
                }
            } catch (error) {
                process.exit(1);
            }
            return;
        }

        // 正常模式
        await gitAutoCommit.initializeAI();
        
        if (options.multiple) {
            const count = parseInt(options.count);
            const messages = await gitAutoCommit.generateMultipleOptions(count);
            
            if (messages.length > 0) {
                console.log(chalk.cyan('🤖 AI生成的提交信息选项:'));
                messages.forEach((message, index) => {
                    console.log(chalk.gray(`${index + 1}. ${message}`));
                });
            }
        } else {
            const message = await gitAutoCommit.generateCommitMessage();
            if (message) {
                console.log(chalk.cyan('🤖 AI生成的提交信息:'));
                console.log(chalk.white(message));
            }
        }
    });

// 显示变更摘要
program
    .command('status')
    .alias('st')
    .description('显示Git状态摘要')
    .action(async () => {
        const gitAutoCommit = new GitAutoCommit();
        await gitAutoCommit.showStatusSummary();
    });

// 配置管理
program
    .command('config')
    .description('配置管理')
    .option('-i, --interactive', '交互式配置')
    .option('-s, --show', '显示当前配置')
    .option('-r, --reset', '重置配置')
    .option('--set-dashscope-key <key>', '设置百炼API密钥')
    .option('--set-model <model>', '设置AI模型')
    .option('--set-language <lang>', '设置语言 (zh-CN|en)')
    .option('--set-style <style>', '设置提交风格 (conventional|free)')
    .action(async (options) => {
        const configManager = new ConfigManager();
        
        try {
            if (options.interactive) {
                await configManager.interactiveConfig();
                return;
            }
            
            if (options.show) {
                const config = await configManager.getConfig();
                console.log(chalk.cyan('📝 当前配置:'));
                console.log(JSON.stringify(config, null, 2));
                return;
            }
            
            if (options.reset) {
                await configManager.resetConfig();
                console.log(chalk.green('✓ 配置已重置'));
                return;
            }
            
            let hasChanges = false;
            
            if (options.setDashscopeKey) {
                await configManager.setAiProvider('dashscope');
                await configManager.setDashScopeApiKey(options.setDashscopeKey);
                console.log(chalk.green('✓ 百炼API密钥已设置'));
                hasChanges = true;
            }
            
            if (options.setModel) {
                await configManager.setModel(options.setModel);
                console.log(chalk.green(`✓ AI模型已设置为: ${options.setModel}`));
                hasChanges = true;
            }
            
            if (options.setLanguage) {
                if (!['zh-CN', 'en'].includes(options.setLanguage)) {
                    console.log(chalk.red('❌ 无效的语言，支持: zh-CN, en'));
                    return;
                }
                await configManager.setLanguage(options.setLanguage);
                console.log(chalk.green(`✓ 语言已设置为: ${options.setLanguage}`));
                hasChanges = true;
            }
            
            if (options.setStyle) {
                if (!['conventional', 'free'].includes(options.setStyle)) {
                    console.log(chalk.red('❌ 无效的提交风格，支持: conventional, free'));
                    return;
                }
                await configManager.setStyle(options.setStyle);
                console.log(chalk.green(`✓ 提交风格已设置为: ${options.setStyle}`));
                hasChanges = true;
            }
            
            if (!hasChanges) {
                console.log(chalk.yellow('ℹ️  没有指定任何配置选项，使用 --interactive 进行交互式配置'));
                console.log('或使用以下选项:');
                console.log('  --set-dashscope-key <key>     设置百炼API密钥');
                console.log('  --set-model <model>           设置AI模型');
                console.log('  --set-language <lang>         设置语言');
                console.log('  --set-style <style>           设置提交风格');
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ 配置失败: ${error.message}`));
        }
    });

// 快速提交命令
program
    .command('quick')
    .alias('q')
    .description('快速生成并提交')
    .option('-p, --push', '提交后推送到远程')
    .action(async (options) => {
        const gitAutoCommit = new GitAutoCommit();
        await gitAutoCommit.initializeAI();
        
        const message = await gitAutoCommit.generateCommitMessage();
        if (!message) {
            return;
        }
        
        console.log(chalk.cyan(`🤖 生成的提交信息: ${message}`));
        
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '确认使用此提交信息?',
                default: true
            }
        ]);
        
        if (confirm) {
            const ora = require('ora');
            const spinner = ora('提交中...').start();
            try {
                await gitAutoCommit.gitAnalyzer.commitChanges(message);
                spinner.succeed(chalk.green('✓ 提交成功!'));
                
                if (options.push) {
                    spinner.start('推送到远程...');
                    // 这里可以添加推送逻辑
                    spinner.succeed(chalk.green('✓ 推送成功!'));
                }
            } catch (error) {
                spinner.fail(chalk.red(`❌ 操作失败: ${error.message}`));
            }
        }
    });

// Git钩子管理
const hookCommand = program
    .command('hook')
    .description('Git钩子管理');

hookCommand
    .command('install')
    .description('安装Git提交钩子，自动生成提交信息')
    .action(async () => {
        const gitHooks = new GitHooks();
        await gitHooks.installHook();
    });

hookCommand
    .command('uninstall')
    .description('卸载Git提交钩子')
    .action(async () => {
        const gitHooks = new GitHooks();
        await gitHooks.uninstallHook();
    });

hookCommand
    .command('status')
    .description('查看Git钩子状态')
    .action(async () => {
        const gitHooks = new GitHooks();
        await gitHooks.showStatus();
    });

// 保持向后兼容的命令（已废弃）
program
    .command('install-hook')
    .description('安装Git prepare-commit-msg钩子（已废弃，请使用: gac hook install）')
    .action(async () => {
        console.log(chalk.yellow('⚠️ 该命令已废弃，请使用: gac hook install'));
        const gitHooks = new GitHooks();
        await gitHooks.installHook();
    });

program
    .command('uninstall-hook')
    .description('卸载Git prepare-commit-msg钩子（已废弃，请使用: gac hook uninstall）')
    .action(async () => {
        console.log(chalk.yellow('⚠️ 该命令已废弃，请使用: gac hook uninstall'));
        const gitHooks = new GitHooks();
        await gitHooks.uninstallHook();
    });

program
    .command('hook-status')
    .description('查看Git钩子状态（已废弃，请使用: gac hook status）')
    .action(async () => {
        console.log(chalk.yellow('⚠️ 该命令已废弃，请使用: gac hook status'));
        const gitHooks = new GitHooks();
        await gitHooks.showStatus();
    });

// 帮助信息
program
    .command('help')
    .description('显示帮助信息')
    .action(() => {
        console.log(chalk.cyan('Git Auto Commit - AI智能提交信息生成工具'));
        console.log('');
        console.log(chalk.yellow('使用方法:'));
        console.log('  gac                    # 交互式提交');
        console.log('  gac generate           # 生成提交信息');
        console.log('  gac config -i          # 交互式配置');
        console.log('  gac status             # 显示状态摘要');
        console.log('  gac quick              # 快速提交');
        console.log('');
        console.log(chalk.yellow('Git钩子:'));
        console.log('  gac hook install       # 安装Git钩子');
        console.log('  gac hook uninstall     # 卸载Git钩子');
        console.log('  gac hook status        # 查看钩子状态');
        console.log('');
        console.log(chalk.yellow('AI提供商:'));
        console.log('  - 阿里云百炼大模型 (通义千问)');
        console.log('');
        console.log(chalk.yellow('百炼模型选项:'));
        console.log('  - qwen-turbo          # 速度快，推荐');
        console.log('  - qwen-plus           # 平衡性能');
        console.log('  - qwen-max            # 最高质量');
        console.log('');
        console.log(chalk.yellow('配置示例:'));
        console.log('  gac config --set-dashscope-key your-api-key');
        console.log('  gac config --set-model qwen-turbo');
        console.log('  gac config --set-language zh-CN');
        console.log('');
        console.log(chalk.yellow('Git钩子使用:'));
        console.log('  1. gac hook install    # 安装钩子');
        console.log('  2. git commit          # 自动生成提交信息');
        console.log('  3. gac hook uninstall  # 卸载钩子（可选）');
    });

// 处理未知命令
program.on('command:*', () => {
    console.error(chalk.red('❌ 无效的命令'));
    console.log('使用 gac help 查看可用命令');
    process.exit(1);
});

// 如果没有参数，显示帮助
if (process.argv.length === 2) {
    program.outputHelp();
}

program.parse(); 