#!/bin/bash

# 🚀 Git Auto Commit Message - 一键安装脚本
# 自动生成AI驱动的Git提交信息

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${MAGENTA}🚀 Git Auto Commit Message 一键安装${NC}"
echo -e "${CYAN}======================================${NC}"
echo

# 检查系统依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查系统依赖...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ 需要安装 Node.js${NC}"
        echo "请访问: https://nodejs.org/"
        echo "或使用包管理器安装:"
        echo "  macOS: brew install node"
        echo "  Ubuntu: sudo apt install nodejs npm"
        echo "  CentOS: sudo yum install nodejs npm"
        exit 1
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ 需要安装 Git${NC}"
        echo "请访问: https://git-scm.com/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    echo -e "${GREEN}✅ Git: $(git --version | head -n1)${NC}"
    echo
}

# 安装项目依赖
install_dependencies() {
    echo -e "${BLUE}📦 安装项目依赖...${NC}"
    cd "$SCRIPT_DIR"
    
    if [ -f "package.json" ]; then
        npm install --silent
        echo -e "${GREEN}✅ 依赖安装完成${NC}"
    else
        echo -e "${RED}❌ package.json 不存在${NC}"
        exit 1
    fi
    echo
}

# 设置百炼API Key
setup_api_key() {
    echo -e "${BLUE}🔑 设置阿里云百炼API Key${NC}"
    echo -e "${CYAN}🔗 如何获取百炼API Key:${NC}"
    echo "  1. 访问 https://dashscope.aliyun.com/"
    echo "  2. 注册/登录阿里云账号"
    echo "  3. 开通百炼服务"
    echo "  4. 在控制台获取API Key"
    echo
    read -p "请输入百炼API Key (可选，稍后配置): " api_key
    
    if [ -n "$api_key" ]; then
        node -e "
            const ConfigManager = require('./src/configManager');
            const config = new ConfigManager();
            async function setup() {
                await config.setAiProvider('dashscope');
                await config.setDashScopeApiKey('$api_key');
                console.log('✅ 百炼API Key设置成功');
            }
            setup().catch(console.error);
        "
    else
        echo -e "${YELLOW}⚠️ 跳过API Key设置，稍后可通过 'gac config -i' 配置${NC}"
    fi
    echo
}

# 绑定Git Hook
setup_git_hook() {
    echo -e "${BLUE}🔗 绑定Git Hook...${NC}"
    
    # 检查是否在Git仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 当前目录不是Git仓库${NC}"
        echo -e "${CYAN}💡 进入你的Git项目目录，然后运行以下命令绑定Hook:${NC}"
        echo "  node $SCRIPT_DIR/src/cli.js hook install"
        echo
        return
    fi
    
    echo -e "${CYAN}在当前Git仓库中设置自动提交信息生成？${NC}"
    read -p "确认绑定当前仓库的Git Hook? (y/n): " confirm
    
    if [[ $confirm =~ ^[Yy] ]]; then
        # 使用CLI工具安装hook
        node "$SCRIPT_DIR/src/cli.js" hook install
        echo -e "${GREEN}✅ Git Hook绑定成功${NC}"
        echo -e "${CYAN}💡 现在执行 'git commit' 时会自动生成AI提交信息${NC}"
    else
        echo -e "${YELLOW}⚠️ 跳过Hook绑定${NC}"
        echo -e "${CYAN}💡 稍后可在Git项目中运行以下命令:${NC}"
        echo "  node $SCRIPT_DIR/src/cli.js hook install"
    fi
    echo
}

# 创建全局命令
create_global_command() {
    echo -e "${BLUE}🌐 创建全局命令...${NC}"
    
    local command_name="gac"
    local wrapper_script="/usr/local/bin/$command_name"
    
    # 创建包装脚本内容
    local script_content="#!/bin/bash
# Git Auto Commit Message 全局命令
GAC_HOME=\"$SCRIPT_DIR\"
cd \"\$GAC_HOME\" && node src/cli.js \"\$@\"
"
    
    if [ -w "/usr/local/bin" ]; then
        echo "$script_content" > "$wrapper_script"
        chmod +x "$wrapper_script"
        echo -e "${GREEN}✅ 全局命令 '$command_name' 创建成功${NC}"
    else
        echo -e "${YELLOW}⚠️ 需要管理员权限创建全局命令${NC}"
        echo "$script_content" | sudo tee "$wrapper_script" > /dev/null
        sudo chmod +x "$wrapper_script"
        echo -e "${GREEN}✅ 全局命令 '$command_name' 创建成功${NC}"
    fi
    echo
}

# 显示使用说明
show_usage() {
    echo -e "${GREEN}🎉 安装完成！${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo
    echo -e "${CYAN}📍 安装位置: $SCRIPT_DIR${NC}"
    echo
    echo -e "${CYAN}🚀 使用方法:${NC}"
    echo "  gac                    # 生成并交互式提交"
    echo "  gac generate           # 仅生成提交信息"
    echo "  gac status             # 查看Git状态"
    echo "  gac config -i          # 交互式配置"
    echo "  gac hook install       # 在Git项目中安装Hook"
    echo
    echo -e "${CYAN}💡 快速开始:${NC}"
    echo "  1. 进入你的Git项目目录"
    echo "  2. 运行: gac hook install"
    echo "  3. 进行代码修改"
    echo "  4. 运行: git add . && git commit"
    echo "  5. 享受AI自动生成的提交信息！"
    echo
    echo -e "${YELLOW}📚 更多帮助: gac --help${NC}"
    echo
}

# 主安装流程
main() {
    check_dependencies
    install_dependencies
    setup_api_key
    create_global_command
    setup_git_hook
    show_usage
}

# 执行安装
main 