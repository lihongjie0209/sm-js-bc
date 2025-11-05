# EC 椭圆曲线实现计划

## 依赖分析

### SM2Engine 直接依赖
1. **ECFieldElement** (717行) - 有限域元素
2. **ECPoint** (1849行) - 椭圆曲线点
3. **ECCurve** (1290行) - 椭圆曲线（通过ECPoint间接使用）
4. **ECMultiplier** (17行) - 接口
5. **FixedPointCombMultiplier** (43行) - 点乘优化器

### 依赖关系
```
ECFieldElement (独立，只依赖 BigInteger 和 util 类)
    ↓
ECCurve (依赖 ECFieldElement)
    ↓
ECPoint (依赖 ECCurve 和 ECFieldElement)
    ↓
ECMultiplier, FixedPointCombMultiplier (依赖 ECPoint)
```

### SM2P256V1 标准曲线参数
```typescript
// 素数 p (256位)
p = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF

// 曲线参数
a = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC
b = 0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93

// 基点 G (未压缩格式)
Gx = 0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7
Gy = 0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0

// 阶
n = 0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123

// 余因子
h = 1
```

## 实现策略：渐进式简化版本

### 第一阶段：核心功能（仅 SM2 需要的）
1. **ECFieldElement.Fp** - 素数域 Fp 上的模运算
   - 基本运算：add, subtract, multiply, divide, negate, square, invert
   - 平方根：sqrt (Tonelli-Shanks 算法)
   - 编码/解码：toBigInteger, getEncoded
   
2. **ECCurve.Fp** - Fp 上的椭圆曲线
   - 曲线参数：p, a, b, n, h
   - 基点创建：createPoint, getInfinity
   - 点验证：validatePoint
   - 点解码：decodePoint
   
3. **ECPoint.Fp** - Fp 上的椭圆曲线点
   - 仿射坐标：(x, y) 或无穷远点
   - 点运算：add, twice, negate, multiply
   - 归一化：normalize
   - 编码：getEncoded (支持压缩和非压缩格式)
   
4. **ECMultiplier & FixedPointCombMultiplier**
   - ECMultiplier 接口：multiply(ECPoint p, BigInteger k)
   - FixedPointCombMultiplier：使用固定点组合法优化

### 第二阶段：优化（可选，后续添加）
- Jacobian 坐标系统 (提升点加法性能)
- 预计算表 (加速固定点乘法)
- Montgomery reduction (加速模运算)

## 实现顺序

### 步骤 6: ECFieldElement.Fp (预计 ~150 行)
**文件**: `src/math/ec/ECFieldElement.ts`

核心功能：
- 抽象基类 `ECFieldElement` 定义接口
- 内部类 `Fp` 实现素数域运算
- 字段：`q` (模数), `x` (值)
- 方法：所有算术运算 + sqrt

依赖：
- ✅ BigIntegers (已实现)
- ✅ Arrays (已实现)
- ⚠️ **需要添加**: `modInverse` 的改进版本 (扩展欧几里得算法)
- ⚠️ **需要添加**: `modPow` 模幂运算

### 步骤 7: ECCurve.Fp (预计 ~200 行)
**文件**: `src/math/ec/ECCurve.ts`, `src/math/ec/ECConstants.ts`

核心功能：
- 抽象基类 `ECCurve`
- 常量接口 `ECConstants` (ZERO, ONE, TWO, THREE, FOUR, EIGHT)
- 内部类 `Fp` 实现素数域曲线
- 字段：`q` (模数), `a`, `b`, `infinity` (无穷远点), `order`, `cofactor`
- 方法：createPoint, validatePoint, decodePoint, getInfinity

依赖：
- ECFieldElement (步骤 6)
- ⚠️ **需要添加**: `Integers` 工具类

### 步骤 8: ECPoint.Fp (预计 ~300 行)
**文件**: `src/math/ec/ECPoint.ts`

核心功能：
- 抽象基类 `ECPoint`
- 内部类 `Fp` 实现 Fp 上的点
- 字段：`curve`, `x`, `y`, `zs[]` (坐标数组)
- 点运算：add, twice, negate, subtract
- 标量乘法：multiply (二进制法)
- 编码：getEncoded (支持 0x02/0x03 压缩, 0x04 非压缩)
- 解码：从字节解码点

依赖：
- ECCurve (步骤 7)
- ECFieldElement (步骤 6)

### 步骤 9: 点乘法器 (预计 ~80 行)
**文件**: 
- `src/math/ec/ECMultiplier.ts`
- `src/math/ec/AbstractECMultiplier.ts`
- `src/math/ec/FixedPointCombMultiplier.ts`

核心功能：
- `ECMultiplier` 接口：multiply(p, k)
- `AbstractECMultiplier`：抽象基类，提供 checkResult
- `FixedPointCombMultiplier`：使用窗口法优化固定点乘法

依赖：
- ECPoint (步骤 8)
- ⚠️ **需要添加**: `WNafUtil` 的简化版本 (可选)

## 需要补充的工具类

### Integers 工具类
**文件**: `src/util/Integers.ts`

```typescript
export class Integers {
    // 计算整数的位数
    static numberOfLeadingZeros(i: number): number;
    
    // 计算整数的二进制1的个数
    static bitCount(i: number): number;
    
    // 旋转左移
    static rotateLeft(i: number, distance: number): number;
    
    // 旋转右移
    static rotateRight(i: number, distance: number): number;
}
```

### BigIntegers 增强
需要添加到现有的 `src/util/BigIntegers.ts`：

```typescript
// 模幂运算: (base^exponent) mod m
static modPow(base: bigint, exponent: bigint, m: bigint): bigint;

// 获取 BigInt 的位长度
static bitLength(value: bigint): number;

// 获取指定位的值 (0 或 1)
static testBit(value: bigint, n: number): boolean;

// Legendre 符号 (用于平方根判断)
static legendreSymbol(a: bigint, p: bigint): number;
```

## 测试策略

### 单元测试文件
1. `test/math/ec/ECFieldElement.test.ts` - 域运算测试
2. `test/math/ec/ECCurve.test.ts` - 曲线测试
3. `test/math/ec/ECPoint.test.ts` - 点运算测试
4. `test/math/ec/ECMultiplier.test.ts` - 乘法器测试

### 测试向量
使用 SM2 标准测试向量验证：
- 点加法
- 点倍乘
- 标量乘法
- 点编码/解码

## 工作量估算

| 步骤 | 文件 | 预计行数 | 复杂度 |
|------|------|---------|--------|
| 补充 Integers | src/util/Integers.ts | ~50 | 低 |
| 增强 BigIntegers | src/util/BigIntegers.ts | ~100 | 中 |
| ECFieldElement | src/math/ec/ECFieldElement.ts | ~150 | 中 |
| ECCurve | src/math/ec/ECCurve.ts | ~200 | 中 |
| ECPoint | src/math/ec/ECPoint.ts | ~300 | **高** |
| ECMultiplier | src/math/ec/ECMultiplier.ts等 | ~80 | 低 |
| **总计** | | **~880 行** | |

## 关键算法

### 1. Tonelli-Shanks 平方根算法
用于 `ECFieldElement.Fp.sqrt()`，计算模素数 p 的平方根。

### 2. 扩展欧几里得算法
用于 `modInverse`，计算模逆元。

### 3. 点加法公式 (仿射坐标)
```
P + Q = R
λ = (y2 - y1) / (x2 - x1)  // 不同点
λ = (3x1² + a) / (2y1)      // 相同点 (倍点)
x3 = λ² - x1 - x2
y3 = λ(x1 - x3) - y1
```

### 4. 固定点组合法
将标量 k 分解为多个窗口，利用预计算表加速点乘法。

## 风险和注意事项

1. **性能**: TypeScript 的 BigInt 性能可能不如 Java 的 BigInteger
2. **精度**: 确保所有模运算正确处理负数
3. **安全**: 避免侧信道攻击（固定时间运算）
4. **测试**: 需要充分的测试覆盖，特别是边界情况

## 下一步行动

✅ 完成步骤 5: 分析完毕
⏭️ 步骤 6a: 补充 Integers 工具类
⏭️ 步骤 6b: 增强 BigIntegers 工具类
⏭️ 步骤 6c: 实现 ECFieldElement
