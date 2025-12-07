# SM9 签名算法实现需求

## 概述

实现 SM9 标识密码算法的数字签名功能，参考 Bouncy Castle Java 的实现。SM9 是基于双线性对的标识密码算法，是中国商用密码标准 GM/T 0044-2016 的一部分。

## 背景

SM9 算法是基于身份的密码（Identity-Based Cryptography）算法，用户的公钥直接由其身份标识（如邮箱、手机号）派生，无需证书。SM9 支持数字签名、加密和密钥交换三种功能。

## 功能需求

### 1. 椭圆曲线和双线性对

参考：`org.bouncycastle.crypto.params.ECDomainParameters`

#### 1.1 SM9 曲线定义

```typescript
/**
 * SM9 推荐曲线参数
 * 基于 BN 曲线（Barreto-Naehrig curve）
 */
class SM9Parameters {
  // 素数 p (256 位)
  static readonly P: bigint;
  
  // 曲线参数 a, b: y^2 = x^3 + b
  static readonly A: bigint;
  static readonly B: bigint;
  
  // 基点 G1 (E(Fp) 上的点)
  static readonly G1: ECPoint;
  
  // 基点 G2 (E'(Fp2) 上的点)
  static readonly G2: ECPoint;
  
  // 阶 N
  static readonly N: bigint;
}
```

#### 1.2 扩域运算

- **Fp2**: 二次扩域 Fp2 = Fp[u]/(u^2+1)
- **Fp4**: 四次扩域 Fp4 = Fp2[v]/(v^2-u)
- **Fp12**: 十二次扩域 Fp12 = Fp4[w]/(w^3-v)

需要实现：
- 扩域元素加减乘除
- 扩域上的幂运算
- 扩域上的求逆运算

#### 1.3 双线性对

```typescript
/**
 * 双线性对 e: G1 × G2 → GT
 */
interface PairingEngine {
  /**
   * 计算双线性对
   * @param P G1 上的点
   * @param Q G2 上的点
   * @returns GT 中的元素
   */
  pair(P: ECPoint, Q: ECPoint): Fp12Element;
  
  /**
   * Miller 算法
   */
  miller(P: ECPoint, Q: ECPoint): Fp12Element;
  
  /**
   * Final exponentiation
   */
  finalExp(f: Fp12Element): Fp12Element;
}
```

### 2. SM9 签名器

参考：`org.bouncycastle.crypto.signers.SM9Signer`

#### 2.1 接口定义

```typescript
interface SM9Signer extends Signer {
  /**
   * 初始化签名器
   * @param forSigning true 为签名模式，false 为验签模式
   * @param params 密钥参数
   */
  init(forSigning: boolean, params: CipherParameters): void;
  
  /**
   * 生成签名
   * @returns 签名值 (h, S)
   */
  generateSignature(): Uint8Array;
  
  /**
   * 验证签名
   * @param signature 签名值
   * @returns 验证结果
   */
  verifySignature(signature: Uint8Array): boolean;
}
```

#### 2.2 密钥生成

```typescript
/**
 * SM9 主密钥生成
 */
class SM9MasterKeyGenerator {
  /**
   * 生成签名主密钥对
   * @returns { masterPublicKey, masterSecretKey }
   */
  generateSignMasterKeyPair(): SM9SignMasterKeyPair;
}

/**
 * 用户私钥生成
 */
class SM9PrivateKeyGenerator {
  /**
   * 根据用户标识生成用户私钥
   * @param id 用户标识（如邮箱）
   * @param masterSecretKey 主私钥
   * @returns 用户私钥
   */
  generateUserSignKey(
    id: string, 
    masterSecretKey: SM9MasterSecretKey
  ): SM9UserSignKey;
}
```

#### 2.3 签名算法

**输入**：
- 消息 M
- 签名者私钥 dsA

**输出**：
- 签名 (h, S)

**步骤**：
1. 计算 g = e(P1, Ppub-s)
2. 随机选择 r ∈ [1, N-1]
3. 计算 w = g^r
4. 计算 h = H2(M || w, N)
5. 计算 l = (r - h) mod N
6. 如果 l = 0，返回步骤 2
7. 计算 S = l · dsA
8. 输出签名 (h, S)

#### 2.4 验签算法

**输入**：
- 消息 M
- 签名 (h, S)
- 签名者标识 IDA
- 主公钥 Ppub-s

**输出**：
- 验证结果（通过/失败）

**步骤**：
1. 检查 h ∈ [1, N-1]
2. 计算 P = H1(IDA || hid, N) · P1 + Ppub-s
3. 计算 u = e(S, P)
4. 计算 w = u · g^h
5. 计算 h' = H2(M || w, N)
6. 验证 h' = h

### 3. 参数类

```typescript
/**
 * SM9 签名主公钥参数
 */
class SM9SignMasterPublicKeyParameters extends AsymmetricKeyParameter {
  constructor(
    public readonly masterPublicKey: ECPoint  // Ppub-s
  );
}

/**
 * SM9 签名主私钥参数
 */
class SM9SignMasterSecretKeyParameters extends AsymmetricKeyParameter {
  constructor(
    public readonly masterSecretKey: bigint  // ks
  );
}

/**
 * SM9 用户签名私钥参数
 */
class SM9SignPrivateKeyParameters extends AsymmetricKeyParameter {
  constructor(
    public readonly identity: string,         // IDA
    public readonly privateKey: ECPoint       // dsA
  );
}

/**
 * SM9 验签参数（只需主公钥和用户标识）
 */
class SM9VerifyParameters extends CipherParameters {
  constructor(
    public readonly identity: string,         // IDA
    public readonly masterPublicKey: ECPoint  // Ppub-s
  );
}
```

### 4. 哈希函数

```typescript
/**
 * H1: {0,1}* × N → [1, N-1]
 * 将任意字符串和整数映射到椭圆曲线上的点
 */
class SM9Hash {
  /**
   * H1 函数 - 从标识到点
   */
  static H1(id: Uint8Array, hid: number, N: bigint): bigint;
  
  /**
   * H2 函数 - 从消息到整数
   */
  static H2(msg: Uint8Array, w: Uint8Array, N: bigint): bigint;
}
```

## 技术规范

### 算法参数

参考 GM/T 0044-2016：

- **曲线类型**: BN(Barreto-Naehrig) 曲线
- **安全强度**: 128 位
- **素数长度**: 256 位
- **嵌入度**: k = 12
- **签名长度**: 64 字节（h）+ 点的坐标

### 标准向量

使用 GM/T 0044-2016 附录 A 的测试向量。

## 实现要点

### 1. 与 bc-java 保持一致

- 类名和方法与 bc-java 保持一致
- 算法流程完全一致
- 参数格式兼容

### 2. 性能优化

- 使用高效的双线性对实现（Ate/Optimal Ate pairing）
- 预计算和缓存常用值
- 使用快速幂算法

### 3. 安全考虑

- 使用安全随机数生成器
- 防止时序攻击
- 清理敏感数据

## 测试要求

### 1. 单元测试

- [ ] 扩域运算测试
- [ ] 双线性对测试
- [ ] H1/H2 哈希函数测试
- [ ] 密钥生成测试
- [ ] 签名生成测试
- [ ] 签名验证测试
- [ ] 边界条件测试

### 2. 互操作性测试

- [ ] 与 bc-java 的 SM9Signer 对比
- [ ] 使用 GM/T 0044-2016 标准向量
- [ ] 交叉验证（JS 签名 → Java 验签）

### 3. 性能测试

- [ ] 签名性能
- [ ] 验签性能
- [ ] 双线性对性能

## 依赖项

### 新增依赖

- 扩域运算库（Fp2, Fp4, Fp12）
- 双线性对引擎
- SM9 曲线参数

### 已有依赖

- `SM3Digest` - 用于 H1/H2
- `SecureRandom` - 用于生成随机数
- `ECPoint` - 需要扩展支持 G2

## 文件结构

```
src/math/ec/
  ├── ExtensionField.ts    # 扩域基类
  ├── Fp2Element.ts        # Fp2 元素
  ├── Fp4Element.ts        # Fp4 元素
  ├── Fp12Element.ts       # Fp12 元素
  └── PairingEngine.ts     # 双线性对引擎

src/crypto/params/
  ├── SM9Parameters.ts                      # SM9 曲线参数
  ├── SM9SignMasterPublicKeyParameters.ts
  ├── SM9SignMasterSecretKeyParameters.ts
  ├── SM9SignPrivateKeyParameters.ts
  └── SM9VerifyParameters.ts

src/crypto/signers/
  ├── SM9Signer.ts         # SM9 签名器
  └── SM9Hash.ts           # SM9 哈希函数

src/crypto/generators/
  ├── SM9MasterKeyGenerator.ts
  └── SM9PrivateKeyGenerator.ts

test/unit/crypto/signers/
  └── SM9Signer.test.ts

test/graalvm-integration/java/src/test/java/
  └── SM9SignerInteropTest.java
```

## 参考资料

1. **GM/T 0044-2016** - SM9 标识密码算法
2. **ISO/IEC 14888-3** - Digital signature with appendix
3. **Bouncy Castle Java**
   - `org.bouncycastle.crypto.signers.SM9Signer`
   - `org.bouncycastle.crypto.params.SM9Parameters`
4. **学术论文**
   - "Efficient Implementation of Pairing-Based Cryptography"
   - "The Eta Pairing Revisited"

## 优先级

**中** - SM9 是国密标准的一部分，但使用频率低于 SM2/SM3/SM4。建议在基础算法稳定后实现。

## 预估工作量

- 扩域运算：3-4 天
- 双线性对：4-5 天
- SM9 签名器：3-4 天
- 测试：3-4 天
- 文档：1-2 天
- **总计：14-19 天**

## 验收标准

- [ ] 实现完整的 SM9 签名功能
- [ ] 通过所有单元测试
- [ ] 通过与 bc-java 的互操作测试
- [ ] 通过 GM/T 0044-2016 标准向量
- [ ] 代码覆盖率 > 85%
- [ ] 包含完整的 TSDoc 注释
- [ ] 更新 README 和 API 文档
- [ ] 性能达到可接受水平（相比 bc-java）

## 相关 Issues

- [ ] #TBD - SM9 签名算法实现

## 后续工作

完成后可以继续实现：
- SM9 加密算法
- SM9 密钥交换
- SM9 密钥封装（KEM）
