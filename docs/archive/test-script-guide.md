# 测试脚本使用指南

## 概述

`test-all.mjs` 是一个综合的测试脚本，用于自动检测环境依赖并执行JavaScript和Java测试。

### 测试项目说明

- **JavaScript测试**: 位于项目根目录，使用Vitest框架测试SM2/SM3算法的TypeScript实现
- **Java测试**: 位于 `test/graalvm-integration/java/`，使用GraalVM Polyglot API验证JavaScript和Java实现之间的互操作性和算法一致性

## 功能特性

- ✅ **环境检测**: 自动检测Node.js、npm、Java、Maven/Gradle
- ✅ **依赖管理**: 自动安装npm依赖（如果缺失）
- ✅ **双语言支持**: 支持JavaScript和Java测试
- ✅ **灵活配置**: 可选择跳过特定语言的测试
- ✅ **彩色输出**: 清晰的状态指示和错误信息
- ✅ **详细报告**: 测试时间统计和结果汇总

## 使用方法

### 直接运行

```bash
# 运行所有测试（JavaScript + Java）
node test-all.mjs

# 只运行JavaScript测试
node test-all.mjs --skip-java

# 只运行Java测试  
node test-all.mjs --skip-js

# 详细输出模式
node test-all.mjs --verbose

# 显示帮助信息
node test-all.mjs --help
```

### 使用npm脚本

```bash
# 运行所有测试
npm run test:all

# 只运行JavaScript测试
npm run test:js-only

# 只运行Java测试
npm run test:java-only
```

## 环境要求

### JavaScript测试
- **Node.js**: 15.0.0+ (支持ES模块和Web Crypto API)
- **npm**: 任意版本
- **项目文件**: `package.json`, `node_modules` (自动安装)

### Java测试
- **Java**: JDK 17+ (GraalVM集成测试要求)
- **构建工具**: Maven
- **项目目录**: `test/graalvm-integration/java/`
- **构建文件**: `pom.xml`
- **测试类型**: GraalVM Polyglot集成测试（JavaScript与Java互操作性验证）

## 输出说明

### 状态图标
- ✅ **成功**: 操作成功完成
- ❌ **错误**: 严重问题，会阻止测试执行
- ⚠️ **警告**: 非关键问题，可能跳过某些测试
- ℹ️ **信息**: 当前执行的操作

### 退出码
- `0`: 所有测试通过
- `1`: 部分测试失败或环境问题

## 常见问题

### Q: Java未安装怎么办？
A: 脚本会自动跳过Java测试，只执行JavaScript测试。Java测试需要JDK 17+用于GraalVM集成测试。

### Q: Maven未安装怎么办？
A: 脚本会跳过Java测试。Java测试使用Maven构建GraalVM集成测试项目。

### Q: 什么是GraalVM集成测试？
A: Java测试项目验证JavaScript和Java实现之间的互操作性和一致性，使用GraalVM Polyglot API运行跨语言测试。

### Q: node_modules缺失？
A: 脚本会自动运行 `npm install` 安装依赖。

### Q: 如何查看详细的测试输出？
A: 使用 `--verbose` 参数：`node test-all.mjs --verbose`

## 脚本架构

```
test-all.mjs
├── 命令行参数解析
├── 环境检测
│   ├── Node.js/npm版本检查
│   ├── Java版本检查
│   ├── Maven检查（优先）
│   ├── Gradle检查（备用）
│   └── 项目文件检查
├── JavaScript测试
│   ├── 依赖安装
│   └── npm test执行
├── Java测试 (GraalVM集成)
│   ├── Maven项目检测
│   └── 测试执行（mvn clean test）
└── 结果汇总
```

## 扩展和定制

脚本使用纯ES模块编写，易于扩展：

- 添加新的环境检测
- 支持更多构建工具
- 自定义测试命令
- 集成CI/CD流水线

## 兼容性

- **操作系统**: Windows, macOS, Linux
- **Node.js**: 15.0.0+
- **Shell**: 任意（通过Node.js spawn执行命令）