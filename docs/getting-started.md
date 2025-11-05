# 项目启动指南

## 快速开始

### 前置要求

#### 开发阶段
- Node.js >= 20.0.0
- npm >= 10.0.0
- TypeScript >= 5.3.0

#### 完成阶段（互操作测试）
- Java >= 17（推荐使用 GraalVM 21+）
- Maven >= 3.8.0
- 上述开发阶段的所有要求

### 项目初始化

#### 1. 创建项目结构

```bash
# 创建目录结构
mkdir -p src/{crypto/{digests,engines,signers,agreement,params},math/{ec,field},util,exceptions}
mkdir -p test/{unit/{crypto/{digests,engines,signers},math,util},graalvm-integration/java}

# 初始化 package.json
npm init -y
```

#### 2. 安装依赖

```bash
# 安装开发依赖
npm install -D typescript@^5.3.0
npm install -D tsdown@^0.2.0
npm install -D vitest@^1.0.0
npm install -D @vitest/ui@^1.0.0
npm install -D @vitest/coverage-v8@^1.0.0
npm install -D @types/node@^20.0.0

# 可选：用于测试验证的库
npm install -D @noble/curves@^1.2.0
npm install -D @noble/hashes@^1.3.0
```

#### 3. 配置 TypeScript

创建 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

#### 4. 配置 Vitest

创建 `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### 5. 配置 package.json 脚本

```json
{
  "name": "sm-js-bc",
  "version": "0.1.0",
  "description": "SM2/SM3 implementation in TypeScript based on Bouncy Castle",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "tsdown src/index.ts --watch",
    "build": "tsdown src/index.ts --format cjs,esm --dts",
    "build:bundle": "tsdown src/index.ts --format iife --out dist/sm-js-bc.bundle.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run test/unit",
    "test:interop": "npm run build:bundle && cd test/graalvm-integration/java && mvn test",
    "test:all": "npm run test:unit && npm run test:interop",
    "lint": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "sm2",
    "sm3",
    "cryptography",
    "chinese-cryptography",
    "gm",
    "elliptic-curve"
  ],
  "author": "",
  "license": "MIT",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

## 第一个实现：Pack 工具类

### 1. 创建源文件

```typescript
// src/util/Pack.ts
/**
 * 字节打包和解包工具类
 * 用于处理大端序（Big Endian）的整数和字节数组转换
 */
export class Pack {
  /**
   * 将字节数组转换为 32 位整数（大端序）
   */
  static bigEndianToInt(bytes: Uint8Array, offset: number): number {
    let n = bytes[offset] << 24;
    n |= (bytes[offset + 1] & 0xff) << 16;
    n |= (bytes[offset + 2] & 0xff) << 8;
    n |= bytes[offset + 3] & 0xff;
    return n;
  }

  /**
   * 将 32 位整数转换为字节数组（大端序）
   */
  static intToBigEndian(value: number, bytes: Uint8Array, offset: number): void {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  }

  /**
   * 将字节数组转换为 64 位整数（大端序）
   */
  static bigEndianToLong(bytes: Uint8Array, offset: number): bigint {
    const hi = Pack.bigEndianToInt(bytes, offset);
    const lo = Pack.bigEndianToInt(bytes, offset + 4);
    return (BigInt(hi) << 32n) | BigInt(lo >>> 0);
  }

  /**
   * 将 64 位整数转换为字节数组（大端序）
   */
  static longToBigEndian(value: bigint, bytes: Uint8Array, offset: number): void {
    const hi = Number((value >> 32n) & 0xffffffffn);
    const lo = Number(value & 0xffffffffn);
    Pack.intToBigEndian(hi, bytes, offset);
    Pack.intToBigEndian(lo, bytes, offset + 4);
  }
}
```

### 2. 创建测试文件

```typescript
// test/unit/util/Pack.test.ts
import { describe, it, expect } from 'vitest';
import { Pack } from '../../../src/util/Pack';

describe('Pack', () => {
  describe('bigEndianToInt', () => {
    it('should convert bytes to int correctly', () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(0x01020304);
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
      const result = Pack.bigEndianToInt(bytes, 1);
      expect(result).toBe(0x01020304);
    });

    it('should handle max value', () => {
      const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(-1);
    });
  });

  describe('intToBigEndian', () => {
    it('should convert int to bytes correctly', () => {
      const bytes = new Uint8Array(4);
      Pack.intToBigEndian(0x01020304, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    });

    it('should handle offset correctly', () => {
      const bytes = new Uint8Array(6);
      Pack.intToBigEndian(0x01020304, bytes, 1);
      expect(bytes).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x00]));
    });
  });

  describe('round trip', () => {
    it('should convert back and forth correctly', () => {
      const original = 0x12345678;
      const bytes = new Uint8Array(4);
      Pack.intToBigEndian(original, bytes, 0);
      const result = Pack.bigEndianToInt(bytes, 0);
      expect(result).toBe(original);
    });
  });

  describe('bigEndianToLong', () => {
    it('should convert bytes to bigint correctly', () => {
      const bytes = new Uint8Array([
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ]);
      const result = Pack.bigEndianToLong(bytes, 0);
      expect(result).toBe(0x0102030405060708n);
    });
  });

  describe('longToBigEndian', () => {
    it('should convert bigint to bytes correctly', () => {
      const bytes = new Uint8Array(8);
      Pack.longToBigEndian(0x0102030405060708n, bytes, 0);
      expect(bytes).toEqual(new Uint8Array([
        0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08
      ]));
    });
  });
});
```

### 3. 运行测试

```bash
# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 查看测试覆盖率
npm run test:coverage

# 打开测试 UI
npm run test:ui
```

## 开发流程

### TDD 工作流

```
1. 编写测试（红灯）
   ↓
2. 实现代码（绿灯）
   ↓
3. 重构优化
   ↓
4. 提交代码
```

### 示例：实现一个新类

```bash
# 1. 创建测试文件
touch test/unit/util/Arrays.test.ts

# 2. 编写测试（先失败）
npm run test:watch

# 3. 创建实现文件
touch src/util/Arrays.ts

# 4. 实现功能直到测试通过

# 5. 检查覆盖率
npm run test:coverage

# 6. 提交
git add .
git commit -m "feat: implement Arrays utility class"
```

## Git 工作流

### 分支策略

```
main
  ├── feature/phase1-infrastructure    # Phase 1 特性
  ├── feature/phase2-sm3               # Phase 2 特性
  ├── feature/phase3-ec-foundation     # Phase 3 特性
  └── ...
```

### 提交规范

使用 Conventional Commits:

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
test: 测试相关
refactor: 重构
perf: 性能优化
chore: 构建/工具相关
```

示例：
```bash
git commit -m "feat(util): implement Pack utility class"
git commit -m "test(util): add Pack unit tests"
git commit -m "docs: update implementation plan"
```

## 常见问题

### Q: TypeScript 类型错误怎么办？

```bash
# 检查类型错误
npm run lint

# 如果是 node types 的问题
npm install -D @types/node
```

### Q: 测试失败怎么调试？

```bash
# 使用 UI 模式调试
npm run test:ui

# 或者使用 VSCode 的调试功能
# 在 .vscode/launch.json 中配置
```

### Q: 如何对比 Java 实现？

```bash
# 查看 Java 源码
cd data/bc-java
grep -r "class SM3Digest" --include="*.java"

# 使用 IDE 打开 bc-java 项目
code data/bc-java
```

## 下一步

完成 Pack 工具类后，按照以下顺序继续：

1. [ ] Arrays 工具类
2. [ ] Bytes 工具类
3. [ ] BigIntegers 工具类
4. [ ] 异常类
5. [ ] Digest 接口
6. [ ] GeneralDigest 抽象类
7. [ ] SM3Digest 实现

每完成一个，确保：
- ✅ 测试通过
- ✅ 覆盖率 >90%
- ✅ 类型检查通过
- ✅ 代码审查完成

## 参考资源

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Bouncy Castle Java](https://github.com/bcgit/bc-java)
- [GM/T 0003-2012 SM2 标准](http://www.gmbz.org.cn/)
- [GM/T 0004-2012 SM3 标准](http://www.gmbz.org.cn/)
