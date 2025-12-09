# SM2/SM3/SM4 TypeScript 实现项目 - 文档导航

## 📚 文档概览

本项目旨在使用 TypeScript 一比一复刻 Bouncy Castle Java (bc-java) 中的 SM2、SM3、SM4 和 ZUC 算法实现。

> 💡 **提示**: 本文档最后更新于 2025-12-08。已完成的实现报告和过时的指南已移至 [archive/](./archive/) 目录。

## 📖 文档列表

### 1. [需求文档](./需求.md)
- 项目背景和目标
- 技术栈选择
- 基本要求

### 2. [实现计划](./implementation-plan.md) ⭐
- **核心算法模块详解**
  - SM3 消息摘要算法
  - SM2 椭圆曲线算法（签名、加密、密钥交换）
- **基础设施模块**
  - 摘要算法基础设施
  - 椭圆曲线基础设施
  - 工具类和异常处理
- **第三方依赖清单**
  - 运行时依赖：零依赖
  - 开发依赖：TypeScript, tsdown, Vitest
- **项目结构完整规划**
- **10 周实施时间表**
  - Phase 1-7: 分阶段实现
  - 代码规范和文档要求
  - 质量保证措施

### 3. [测试策略](./test-strategy.md) ⭐
- **两阶段测试策略**
  - 阶段 1: 开发阶段 - JavaScript 自闭环测试
  - 阶段 2: 完成阶段 - GraalVM 跨语言互操作测试
- **为什么选择 GraalVM？**
  - 签名场景：交叉验证（JS签名→Java验证，Java签名→JS验证）
  - 密钥交换：交互测试（JS Alice ↔ Java Bob）
  - 加密场景：交叉加解密
- **详细测试实现**
  - Java 测试项目配置
  - GraalVM Context 使用
  - 跨语言对象转换
  - 具体测试用例代码
- **CI/CD 集成方案**
  - 开发阶段 CI（快速反馈）
  - 完成阶段 CI（互操作验证）
- **10 周实施路线图**
  - 每个阶段的测试重点
  - 测试覆盖率目标

### 4. [测试文档](./TESTING.md) 🎯 **[1077 tests ✅]**
- **测试概览和统计**
  - 参数化测试：141 个
  - 属性测试：920 个
  - 互操作测试：16 个
- **测试架构详解**
  - 目录结构和文件组织
  - 测试基类和工具类
- **快速开始指南**
  - 一键运行所有测试
  - JavaScript 单元测试
  - Java GraalVM 互操作测试
- **测试类型详解**
  - 参数化测试示例和模式
  - 属性测试示例和验证属性
  - 互操作测试示例和场景
- **环境配置**
  - JavaScript 和 Java 测试环境要求
  - 依赖配置和版本要求
- **编写测试指南**
  - 添加新测试的步骤
  - 测试最佳实践
  - 调试技巧
- **测试覆盖率目标**

### 5. [API 一致性审计报告](./API_CONSISTENCY_AUDIT.md) 🔍 **NEW!**
- **总体评估**
  - 整体一致性：良好 (91%)
  - 核心功能完整性：100%
- **详细差异与修改建议**
  - SM3Digest、SM2Engine、SM4Engine 接口对比
  - SM2Signer、SM2KeyExchange 接口对比
  - 参数类、异常类、工具类对比
- **类型映射总结**
- **接口一致性评分**
- **总结建议**

### 6. [API 改进文档](./API_IMPROVEMENTS.md) ✨ **NEW!**
- **v0.3.1 版本 API 改进**
  - SM3Digest.reset(Memoable) 方法重载
  - SM2Engine.Mode 静态别名
  - SM2Signer 扩展性方法
- **使用示例和迁移指南**
- **向后兼容性说明**
- **测试验证**
- **版本历史**

### 7. [快速开始指南](./getting-started.md) ⭐
- **环境准备**
  - Node.js, TypeScript 配置
  - Java + GraalVM 配置（互操作测试用）
- **项目初始化步骤**
  - 目录结构创建
  - 依赖安装
  - 配置文件设置
- **第一个实现：Pack 工具类**
  - 完整源码
  - 完整测试代码
  - 运行测试的命令
- **TDD 工作流指南**
- **Git 工作流和提交规范**

### 8. [实现者快速指南](./QUICK_START_GUIDE_FOR_IMPLEMENTERS.md) 📋
- 面向贡献者的快速参考指南
- 代码结构和最佳实践
- 开发工作流程

### 9. [BC Java 特性对比](./bc-java-feature-comparison.md) 📊
- 与 Bouncy Castle Java 的功能对比
- 已实现功能清单
- 待实现功能规划

### 10. [项目规划总结](./PROJECT_PLANNING_SUMMARY.md) 🗺️
- 整体项目规划
- 模块需求说明
- 实施路线图

### 11. [Phase 3 实现总结](./PHASE3_IMPLEMENTATION_SUMMARY.md) 🆕
- ZUC 流密码实现总结
- 生产就绪状态
- 与 BC Java 兼容性验证

### 12. [Java 测试增强计划](./java-test-enhancement-plan.md) 🧪
- 未来测试增强规划
- 测试框架改进建议

### 13. [Java 测试执行指南](./java-test-execution-guide.md) 🔧
- 如何运行 Java 互操作测试
- 环境配置和故障排除

### 14. [GitHub Actions 日常测试](./github-actions-daily-test.md) 🤖
- CI/CD 配置说明
- 自动化测试流程

### 15. [椭圆曲线实现计划](./ec-implementation-plan.md) 📐
- EC 算法实现规划
- 技术细节和架构

## 🚀 快速导航

### 如果你是项目新成员
1. 先阅读 [需求文档](./需求.md) 了解项目背景
2. 再看 [实现计划](./implementation-plan.md) 了解技术架构
3. 最后跟随 [快速开始指南](./getting-started.md) 搭建环境

### 如果你要开始编码
1. 确保已完成 [快速开始指南](./getting-started.md) 的环境配置
2. 参考 [实现计划](./implementation-plan.md) 中的项目结构
3. 按照 [测试策略](./test-strategy.md) 编写测试优先的代码

### 如果你要理解测试方案
1. 重点阅读 [测试策略](./test-strategy.md)
2. 理解两阶段测试的设计理念
3. 查看具体的测试代码示例

## 📊 项目实现状态

### ✅ 已完成的主要功能

- **SM3 消息摘要算法** - 完全实现，包含 HMAC-SM3
- **SM2 椭圆曲线算法** - 数字签名、公钥加密、密钥交换
- **SM4 分组密码算法** - 支持 ECB、CBC、CTR、GCM 等多种模式
- **ZUC 流密码算法** - ZUC-128/256 及其 MAC 变体
- **X.509 PKI 支持** - 证书生成、解析、验证
- **PEM/PKCS#8** - 密钥编码和解析
- **完整测试套件** - 1077+ 测试用例，包括跨语言互操作测试

### 📦 当前版本: v0.4.0

查看 [CHANGELOG.md](../CHANGELOG.md) 了解详细的版本历史。

## 🎯 核心设计决策

### 1. 为什么零运行时依赖？
- ✅ 完全控制实现细节
- ✅ 与 bc-java 一比一对应
- ✅ 无外部库的安全风险
- ✅ 包体积最小化

### 2. 为什么使用两阶段测试？
- **阶段 1（自闭环）优势**：
  - 开发效率高，快速迭代
  - 易于调试和定位问题
  - 适合 CI 持续集成
  
- **阶段 2（GraalVM）必要性**：
  - 验证真正的互操作性
  - 覆盖随机性场景（每次签名/加密不同）
  - 覆盖交互场景（密钥协商需要双方）
  - 确保与 bc-java 100% 兼容

### 3. 为什么选择 GraalVM 而不是其他方案？
- ✅ 真正的 Java ↔ JavaScript 互操作
- ✅ 可以直接在 Java 测试中加载和调用 JS 代码
- ✅ 支持复杂的对象传递和类型转换
- ✅ 性能优秀，适合加密算法测试
- ✅ Oracle 官方支持，生态成熟

### 4. 项目结构为什么这样设计？
```
src/
├── crypto/          # 密码学算法（对应 bc-java 的 crypto 包）
├── math/            # 数学运算（对应 bc-java 的 math 包）
├── util/            # 工具类（对应 bc-java 的 util 包）
└── exceptions/      # 异常类
```
- ✅ 与 bc-java 包结构一致
- ✅ 便于对照参考源码
- ✅ 职责清晰，易于维护

## 🔗 相关资源

### 官方标准文档
- [GM/T 0003-2012 SM2 椭圆曲线公钥密码算法](http://www.gmbz.org.cn/)
- [GM/T 0004-2012 SM3 密码杂凑算法](http://www.gmbz.org.cn/)
- [GB/T 32905-2016 信息安全技术 SM3密码杂凑算法](http://www.gb688.cn/)

### 参考实现
- [Bouncy Castle Java](https://github.com/bcgit/bc-java) - 本项目的参考实现
- [GmSSL](https://github.com/guanzhi/GmSSL) - C 语言实现
- [@noble/curves](https://github.com/paulmillr/noble-curves) - JavaScript 椭圆曲线库（仅用于测试对比）

### 技术文档
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [GraalVM Polyglot API](https://www.graalvm.org/latest/reference-manual/polyglot-programming/)
- [tsdown Documentation](https://tsdown.netlify.app/)

### IETF 草案
- [draft-shen-sm2-ecdsa-02](https://tools.ietf.org/html/draft-shen-sm2-ecdsa-02) - SM2 ECDSA
- [draft-shen-sm3-hash-01](https://tools.ietf.org/html/draft-shen-sm3-hash-01) - SM3 Hash

## 📁 文档归档

历史文档和已完成工作的报告已移至 [archive/](./archive/) 目录，包括：

- 阶段完成总结报告
- 实现指南（已完成的功能）
- 测试实现报告
- README 改进报告

这些文档保留用于历史参考，但不再是活跃维护的文档。

## 💡 最佳实践

### 编码实践
1. **始终参考 bc-java 源码** - 保持实现一致性
2. **保留原始注释** - 包括算法说明和标准引用
3. **使用严格类型** - 充分利用 TypeScript 类型系统
4. **测试先行（TDD）** - 先写测试，再写实现

### 测试实践
1. **开发时用自闭环** - 快速验证逻辑正确性
2. **发布前用 GraalVM** - 确保互操作性
3. **使用标准向量** - 验证符合国密标准
4. **覆盖边界条件** - 空输入、最大值、异常情况

### 文档实践
1. **API 文档使用 TSDoc** - 自动生成文档
2. **算法注释中英双语** - 便于理解
3. **示例代码可运行** - 确保示例有效

## ❓ 常见问题

### Q: 为什么不直接使用现有的 JavaScript 加密库？
A: 本项目的目标是一比一复刻 bc-java 实现，确保与 Java 生态完全兼容，这是现有库无法保证的。

### Q: GraalVM 测试会不会太复杂？
A: 开发阶段完全不需要 GraalVM，只在最后验证互操作性时使用。大部分时间是在做简单快速的自闭环测试。

### Q: 性能会比 bc-java 差吗？
A: JavaScript 引擎（V8/Node.js）的性能已经非常接近 JVM，对于加密算法这种计算密集型任务，性能差异在可接受范围内。

### Q: 可以用在浏览器中吗？
A: 可以！项目会输出 ESM 和 IIFE 格式，都可以在浏览器中使用。只是某些依赖 Node.js API 的测试代码仅在 Node 环境运行。

### Q: 如何贡献代码？
A: 
1. Fork 项目
2. 创建特性分支
3. 编写代码和测试（确保测试通过）
4. 提交 Pull Request
5. 等待代码审查

## 📝 文档变更日志

### 2025-12-08
- 整理和归档过时文档
- 将完成的工作报告移至 archive/ 目录
- 更新文档导航以反映当前项目状态
- 更新项目概览（SM2/SM3/SM4/ZUC 已实现）

### 2025-10-31
- 创建项目文档结构
- 完成实现计划文档
- 完成测试策略文档（两阶段测试方案）
- 完成快速开始指南
- 创建文档导航

## 🎉 开始你的第一个贡献

```bash
# 克隆项目
git clone <repository-url>
cd sm-js-bc

# 安装依赖
npm install

# 创建第一个实现
# 跟随 docs/getting-started.md 的指引

# 运行测试
npm test

# 提交代码
git add .
git commit -m "feat(util): implement Pack utility class"
git push
```

---

**祝编码愉快！如有疑问，请查阅相关文档或提出 Issue。**
