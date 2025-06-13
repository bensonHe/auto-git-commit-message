# 🚀 Git Auto Commit Message

基于AI大模型的智能Git提交信息生成工具，自动分析代码变更并生成规范的中文提交信息。

## ✨ 功能特性

- 🤖 **AI智能分析** - 基于阿里云百炼大模型，智能理解代码变更
- 🇨🇳 **中文友好** - 生成规范的中文提交信息
- ⚡ **一键安装** - 简单的安装脚本，快速上手
- 🔄 **自动触发** - 通过Git Hook自动生成提交信息
- 📝 **多种格式** - 支持Conventional Commits规范
- 🎯 **智能识别** - 自动识别变更类型和影响范围

## 🚀 快速开始

### 一键安装

```bash
# 克隆项目
git clone https://github.com/your-repo/git-auto-commit-message.git
cd git-auto-commit-message

# 运行安装脚本
./install.sh
```

安装脚本会自动：
1. ✅ 检查系统依赖（Node.js、Git）
2. 📦 安装项目依赖
3. 🔑 引导设置百炼API Key
4. 🌐 创建全局命令 `gac` **（全局生效）**
5. 🔗 可选绑定当前Git仓库的Hook **（仓库特定）**

> 📌 **说明**: `gac`命令和配置全局生效，可在任何地方使用；Git Hook需在每个项目中单独绑定。

### 设置API Key

安装过程中会引导你设置百炼API Key：

**阿里云百炼**
1. 访问 [百炼控制台](https://dashscope.aliyun.com/)
2. 注册/登录阿里云账号
3. 开通百炼服务
4. 获取API Key

## 📖 使用方法

### 基础命令

```bash
# 生成并交互式提交
gac

# 仅生成提交信息
gac generate

# 查看Git状态摘要
gac status

# 交互式配置
gac config -i
```

### Git Hook自动模式

在你的Git项目中安装Hook后，每次`git commit`都会自动生成AI提交信息：

```bash
# 在Git项目中安装Hook
gac hook install

# 正常提交流程
git add .
git commit          # 自动生成AI提交信息

# 卸载Hook（可选）
gac hook uninstall
```

### 配置管理

```bash
# 交互式配置
gac config -i

# 命令行配置
gac config --set-dashscope-key your-api-key
gac config --set-model qwen-turbo
gac config --set-language zh-CN

# 查看当前配置
gac config --show

# 重置配置
gac config --reset
```

## 🔧 配置选项

### 百炼模型选项
- `qwen-turbo` - 速度快，推荐日常使用
- `qwen-plus` - 平衡性能和质量
- `qwen-max` - 最高质量

### 语言选项
- `zh-CN` - 中文（默认）
- `en` - 英文

### 提交风格
- `conventional` - 遵循Conventional Commits规范（默认）
- `free` - 自由格式

## 💡 工作原理

1. **代码分析** - 分析Git变更，识别文件类型和变更模式
2. **AI理解** - 使用大模型理解代码变更的语义和意图
3. **信息生成** - 生成符合规范的中文提交信息
4. **自动集成** - 通过Git Hook无缝集成到工作流程

## 🎯 示例效果

```bash
# 添加新功能
feat(auth): 添加用户认证功能

- 新增JWT令牌验证中间件
- 实现用户登录和注册接口
- 添加密码加密和验证逻辑

# 修复Bug
fix(api): 修复用户信息更新接口错误

- 解决字段验证逻辑错误
- 修复空值处理问题
- 添加错误处理和日志

# 重构代码
refactor(utils): 优化工具函数结构

- 重构日期处理函数
- 提取公共验证逻辑
- 改进代码可读性
```

## 🔍 完整使用示例

### 第一次使用

```bash
# 1. 安装工具
git clone https://github.com/your-repo/git-auto-commit-message.git
cd git-auto-commit-message
./install.sh

# 2. 进入你的项目
cd /path/to/your/project

# 3. 安装Hook
gac hook install

# 4. 正常开发和提交
echo "console.log('新功能')" > feature.js
git add feature.js
git commit  # 自动生成: feat(feature): 添加控制台日志功能
```

### 日常使用工作流

```bash
# 方式1: 自动模式（推荐）
git add .
git commit  # Hook自动生成提交信息

# 方式2: 手动生成
gac generate  # 生成提交信息
git commit -m "$(gac generate)"  # 使用生成的信息

# 方式3: 交互模式
gac  # 交互式生成和提交
```

## 🛠️ 项目结构

```
git-auto-commit-message/
├── src/
│   ├── cli.js                 # CLI入口
│   ├── index.js              # 主要逻辑
│   ├── gitAnalyzer.js        # Git分析器
│   ├── aiCommitGenerator.js  # AI生成器
│   ├── dashscopeGenerator.js # 百炼集成
│   ├── configManager.js     # 配置管理
│   └── gitHooks.js          # Git Hook管理
├── install.sh               # 一键安装脚本
├── package.json
├── config.json             # 配置文件
└── README.md
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [阿里云百炼](https://dashscope.aliyun.com/)
- [Conventional Commits](https://www.conventionalcommits.org/) 


## 🤝  加个公众号 , 欢迎关注, 一起探索AI小应用

包子的实验室 
![公众号][arch]
[arch]: ./image/gzh.jpg "公众号图片"