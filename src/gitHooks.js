const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class GitHooks {
    constructor() {
        this.hookName = 'prepare-commit-msg';
        this.hookPath = path.join(process.cwd(), '.git', 'hooks', this.hookName);
        this.toolPath = path.resolve(__dirname, 'cli.js');
    }

    /**
     * 检查是否在Git仓库中
     */
    async isGitRepository() {
        try {
            await fs.access(path.join(process.cwd(), '.git'));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 生成钩子脚本内容
     */
    generateHookScript() {
        return `#!/bin/sh
#
# Git Auto Commit Message Hook
# 自动生成AI提交信息
#

# 检查是否是合并提交或其他特殊提交
if [ "$2" = "merge" ] || [ "$2" = "squash" ] || [ "$2" = "commit" ]; then
    exit 0
fi

# 检查是否已经有提交信息
if [ -s "$1" ]; then
    # 如果已经有提交信息，不覆盖
    exit 0
fi

# 使用Node.js生成AI提交信息
COMMIT_MSG_FILE="$1"
TOOL_PATH="${this.toolPath}"

# 检查工具是否存在
if [ ! -f "$TOOL_PATH" ]; then
    echo "Git Auto Commit tool not found at: $TOOL_PATH"
    exit 0
fi

# 生成AI提交信息
AI_MESSAGE=$(node "$TOOL_PATH" generate --hook 2>/dev/null)

# 检查是否成功生成
if [ $? -eq 0 ] && [ -n "$AI_MESSAGE" ]; then
    echo "$AI_MESSAGE" > "$COMMIT_MSG_FILE"
    echo "✨ AI生成的提交信息: $AI_MESSAGE"
else
    echo "⚠️  AI提交信息生成失败，请手动输入提交信息"
fi
`;
    }

    /**
     * 安装Git钩子
     */
    async installHook() {
        try {
            // 检查是否在Git仓库中
            if (!await this.isGitRepository()) {
                throw new Error('当前目录不是Git仓库');
            }

            // 确保hooks目录存在
            const hooksDir = path.dirname(this.hookPath);
            await fs.mkdir(hooksDir, { recursive: true });

            // 检查是否已存在钩子
            let existingHook = '';
            try {
                existingHook = await fs.readFile(this.hookPath, 'utf8');
            } catch {
                // 文件不存在，继续安装
            }

            // 如果已存在我们的钩子，跳过
            if (existingHook.includes('Git Auto Commit Message Hook')) {
                console.log(chalk.yellow('⚠️  Git钩子已经安装'));
                return true;
            }

            // 如果存在其他钩子，备份
            if (existingHook.trim()) {
                const backupPath = `${this.hookPath}.backup.${Date.now()}`;
                await fs.writeFile(backupPath, existingHook);
                console.log(chalk.blue(`📦 已备份现有钩子到: ${backupPath}`));
            }

            // 写入新钩子
            const hookScript = this.generateHookScript();
            await fs.writeFile(this.hookPath, hookScript);

            // 设置执行权限
            await fs.chmod(this.hookPath, 0o755);

            console.log(chalk.green('✅ Git钩子安装成功！'));
            console.log(chalk.gray(`📍 钩子位置: ${this.hookPath}`));
            console.log(chalk.cyan('🎉 现在执行 git commit 时会自动生成AI提交信息'));

            return true;

        } catch (error) {
            console.error(chalk.red(`❌ 安装Git钩子失败: ${error.message}`));
            return false;
        }
    }

    /**
     * 卸载Git钩子
     */
    async uninstallHook() {
        try {
            // 检查钩子是否存在
            let hookContent = '';
            try {
                hookContent = await fs.readFile(this.hookPath, 'utf8');
            } catch {
                console.log(chalk.yellow('⚠️  Git钩子不存在'));
                return true;
            }

            // 检查是否是我们的钩子
            if (!hookContent.includes('Git Auto Commit Message Hook')) {
                console.log(chalk.yellow('⚠️  当前钩子不是由本工具安装的'));
                return false;
            }

            // 删除钩子文件
            await fs.unlink(this.hookPath);

            // 查找并恢复备份
            const hooksDir = path.dirname(this.hookPath);
            const files = await fs.readdir(hooksDir);
            const backupFiles = files.filter(file => 
                file.startsWith(`${this.hookName}.backup.`)
            ).sort().reverse(); // 最新的备份在前

            if (backupFiles.length > 0) {
                const latestBackup = path.join(hooksDir, backupFiles[0]);
                const backupContent = await fs.readFile(latestBackup, 'utf8');
                await fs.writeFile(this.hookPath, backupContent);
                await fs.chmod(this.hookPath, 0o755);
                await fs.unlink(latestBackup);
                console.log(chalk.blue('📦 已恢复之前的钩子'));
            }

            console.log(chalk.green('✅ Git钩子卸载成功！'));
            return true;

        } catch (error) {
            console.error(chalk.red(`❌ 卸载Git钩子失败: ${error.message}`));
            return false;
        }
    }

    /**
     * 检查钩子状态
     */
    async getHookStatus() {
        try {
            if (!await this.isGitRepository()) {
                return {
                    installed: false,
                    message: '当前目录不是Git仓库'
                };
            }

            let hookContent = '';
            try {
                hookContent = await fs.readFile(this.hookPath, 'utf8');
            } catch {
                return {
                    installed: false,
                    message: 'Git钩子未安装'
                };
            }

            if (hookContent.includes('Git Auto Commit Message Hook')) {
                return {
                    installed: true,
                    message: 'Git钩子已安装并激活',
                    path: this.hookPath
                };
            } else {
                return {
                    installed: false,
                    message: '存在其他Git钩子，本工具钩子未安装'
                };
            }

        } catch (error) {
            return {
                installed: false,
                message: `检查钩子状态失败: ${error.message}`
            };
        }
    }

    /**
     * 显示钩子状态
     */
    async showStatus() {
        const status = await this.getHookStatus();
        
        console.log(chalk.cyan('🔗 Git钩子状态:'));
        
        if (status.installed) {
            console.log(chalk.green(`✅ ${status.message}`));
            if (status.path) {
                console.log(chalk.gray(`📍 位置: ${status.path}`));
            }
        } else {
            console.log(chalk.yellow(`⚠️  ${status.message}`));
        }

        return status;
    }
}

module.exports = GitHooks; 