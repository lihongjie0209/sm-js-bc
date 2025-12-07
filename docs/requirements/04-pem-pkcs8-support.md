# PEM/PKCS#8 密钥格式支持需求

## 概述

实现 PEM 格式和 PKCS#8 密钥编码/解码功能，支持 SM2/SM4 密钥的导入导出，参考 Bouncy Castle Java 的实现。

## 背景

PEM（Privacy Enhanced Mail）是一种广泛使用的密钥和证书编码格式，使用 Base64 编码和边界标记（如 `-----BEGIN PRIVATE KEY-----`）。PKCS#8 是定义私钥信息语法的标准，支持加密存储。

在实际应用中，密钥通常需要以 PEM/PKCS#8 格式存储和传输，因此支持这些格式对于互操作性至关重要。

## 功能需求

### 1. PEM 编码/解码

参考：`org.bouncycastle.util.io.pem`

#### 1.1 PEM 读取器

```typescript
/**
 * PEM 对象
 */
class PemObject {
  constructor(
    public readonly type: string,        // 如 "PRIVATE KEY"
    public readonly headers: Map<string, string>,
    public readonly content: Uint8Array
  );
}

/**
 * PEM 读取器
 */
class PemReader {
  constructor(reader: Reader);
  
  /**
   * 读取下一个 PEM 对象
   */
  readPemObject(): PemObject | null;
}
```

#### 1.2 PEM 写入器

```typescript
/**
 * PEM 写入器
 */
class PemWriter {
  constructor(writer: Writer);
  
  /**
   * 写入 PEM 对象
   */
  writeObject(obj: PemObject): void;
}
```

#### 1.3 PEM 格式示例

```
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqBHM9VAYItBG0wawIBAQQgxxx...
...
-----END PRIVATE KEY-----
```

### 2. PKCS#8 私钥编码

参考：`org.bouncycastle.pkcs.PKCS8EncryptedPrivateKeyInfo`

#### 2.1 未加密 PKCS#8

```typescript
/**
 * PKCS#8 PrivateKeyInfo
 * 
 * PrivateKeyInfo ::= SEQUENCE {
 *   version         Version,
 *   privateKeyAlgorithm PrivateKeyAlgorithmIdentifier,
 *   privateKey      OCTET STRING,
 *   attributes      [0] IMPLICIT Attributes OPTIONAL
 * }
 */
class PrivateKeyInfo {
  constructor(
    public readonly algorithm: AlgorithmIdentifier,
    public readonly privateKey: Uint8Array,
    public readonly attributes?: Attributes
  );
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): PrivateKeyInfo;
}
```

#### 2.2 加密 PKCS#8

```typescript
/**
 * PKCS#8 EncryptedPrivateKeyInfo
 * 
 * EncryptedPrivateKeyInfo ::= SEQUENCE {
 *   encryptionAlgorithm  EncryptionAlgorithmIdentifier,
 *   encryptedData        OCTET STRING
 * }
 */
class EncryptedPrivateKeyInfo {
  constructor(
    public readonly encryptionAlgorithm: AlgorithmIdentifier,
    public readonly encryptedData: Uint8Array
  );
  
  /**
   * 使用密码解密
   */
  decrypt(password: string): PrivateKeyInfo;
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): EncryptedPrivateKeyInfo;
}
```

#### 2.3 加密方案

支持以下加密方案：
- **PBES2** (Password-Based Encryption Scheme 2)
  - PBKDF2 密钥派生
  - SM4-CBC 或 AES-CBC 加密
- **传统方案**
  - PBE-SM4-CBC
  - PBE-SHA1-3DES

### 3. PKCS#8 公钥编码

参考：`org.bouncycastle.asn1.x509.SubjectPublicKeyInfo`

```typescript
/**
 * SubjectPublicKeyInfo
 * 
 * SubjectPublicKeyInfo ::= SEQUENCE {
 *   algorithm         AlgorithmIdentifier,
 *   subjectPublicKey  BIT STRING
 * }
 */
class SubjectPublicKeyInfo {
  constructor(
    public readonly algorithm: AlgorithmIdentifier,
    public readonly publicKey: Uint8Array
  );
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): SubjectPublicKeyInfo;
}
```

### 4. SM2 密钥编码/解码

#### 4.1 SM2 私钥 PKCS#8 格式

```typescript
/**
 * SM2 私钥转 PKCS#8
 */
class SM2PrivateKeyEncoder {
  /**
   * 编码为 PKCS#8 DER
   */
  static encodeToDER(privateKey: bigint): Uint8Array;
  
  /**
   * 编码为 PKCS#8 PEM
   */
  static encodeToPEM(privateKey: bigint): string;
  
  /**
   * 从 PKCS#8 DER 解码
   */
  static decodeFromDER(der: Uint8Array): bigint;
  
  /**
   * 从 PKCS#8 PEM 解码
   */
  static decodeFromPEM(pem: string): bigint;
}
```

#### 4.2 SM2 公钥 X.509 格式

```typescript
/**
 * SM2 公钥转 X.509 SubjectPublicKeyInfo
 */
class SM2PublicKeyEncoder {
  /**
   * 编码为 DER
   */
  static encodeToDER(publicKey: ECPoint): Uint8Array;
  
  /**
   * 编码为 PEM
   */
  static encodeToPEM(publicKey: ECPoint): string;
  
  /**
   * 从 DER 解码
   */
  static decodeFromDER(der: Uint8Array): ECPoint;
  
  /**
   * 从 PEM 解码
   */
  static decodeFromPEM(pem: string): ECPoint;
}
```

### 5. SM4 密钥编码/解码

```typescript
/**
 * SM4 密钥编码器
 */
class SM4KeyEncoder {
  /**
   * 编码为 PKCS#8 DER
   */
  static encodeToDER(key: Uint8Array): Uint8Array;
  
  /**
   * 编码为 PKCS#8 PEM
   */
  static encodeToPEM(key: Uint8Array): string;
  
  /**
   * 从 PKCS#8 DER 解码
   */
  static decodeFromDER(der: Uint8Array): Uint8Array;
  
  /**
   * 从 PKCS#8 PEM 解码
   */
  static decodeFromPEM(pem: string): Uint8Array;
}
```

### 6. ASN.1 编码/解码

参考：`org.bouncycastle.asn1`

#### 6.1 基本类型

```typescript
/**
 * ASN.1 对象标识符
 */
class ASN1ObjectIdentifier {
  constructor(oid: string);  // 如 "1.2.156.10197.1.301"
  
  toString(): string;
}

/**
 * ASN.1 序列
 */
class ASN1Sequence {
  constructor(elements: ASN1Encodable[]);
  
  getObjectAt(index: number): ASN1Encodable;
  size(): number;
}

/**
 * ASN.1 八位字节串
 */
class ASN1OctetString {
  constructor(octets: Uint8Array);
  
  getOctets(): Uint8Array;
}

/**
 * ASN.1 整数
 */
class ASN1Integer {
  constructor(value: bigint);
  
  getValue(): bigint;
}
```

#### 6.2 算法标识符

```typescript
/**
 * 算法标识符
 * 
 * AlgorithmIdentifier ::= SEQUENCE {
 *   algorithm   OBJECT IDENTIFIER,
 *   parameters  ANY DEFINED BY algorithm OPTIONAL
 * }
 */
class AlgorithmIdentifier {
  constructor(
    public readonly algorithm: ASN1ObjectIdentifier,
    public readonly parameters?: ASN1Encodable
  );
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): AlgorithmIdentifier;
}
```

#### 6.3 常用 OID

```typescript
/**
 * 国密算法 OID
 */
class GMObjectIdentifiers {
  // SM2
  static readonly sm2: ASN1ObjectIdentifier;        // 1.2.156.10197.1.301
  static readonly sm2_with_sm3: ASN1ObjectIdentifier;  // 1.2.156.10197.1.501
  
  // SM3
  static readonly sm3: ASN1ObjectIdentifier;        // 1.2.156.10197.1.401
  
  // SM4
  static readonly sm4: ASN1ObjectIdentifier;        // 1.2.156.10197.1.104
  static readonly sm4_cbc: ASN1ObjectIdentifier;    // 1.2.156.10197.1.104.2
  static readonly sm4_ecb: ASN1ObjectIdentifier;    // 1.2.156.10197.1.104.1
}
```

## 技术规范

### 标准文档

- **RFC 5208** - PKCS #8: Private-Key Information Syntax Specification
- **RFC 5958** - Asymmetric Key Packages
- **RFC 7468** - Textual Encodings of PKIX, PKCS, and CMS Structures
- **RFC 8018** - PKCS #5: Password-Based Cryptography Specification Version 2.1
- **GM/T 0009** - SM2密码算法使用规范
- **GM/T 0015** - 基于SM2密码算法的数字证书格式规范

### 编码格式

- **DER**: Distinguished Encoding Rules（确定性编码规则）
- **PEM**: Base64 编码 + 边界标记
- **Base64**: 标准 Base64 编码，每行最多 64 字符

## 实现要点

### 1. 与 bc-java 保持一致

- 编码输出格式与 bc-java 一致
- 能够解析 bc-java 生成的文件
- OID 定义与 bc-java 一致

### 2. ASN.1 编码

- 支持 DER 编码（确定性）
- 正确处理标签、长度、值（TLV）
- 支持嵌套结构

### 3. 错误处理

- 解析错误时提供清晰的错误信息
- 验证数据完整性
- 检查格式正确性

## 测试要求

### 1. 单元测试

- [ ] PEM 编码/解码测试
- [ ] PKCS#8 编码/解码测试
- [ ] ASN.1 编码/解码测试
- [ ] SM2 密钥转换测试
- [ ] SM4 密钥转换测试
- [ ] 加密 PKCS#8 测试
- [ ] 边界条件测试

### 2. 互操作性测试

- [ ] 与 bc-java 生成的密钥互操作
- [ ] 与 OpenSSL 生成的密钥互操作
- [ ] 与 GmSSL 生成的密钥互操作

### 3. 兼容性测试

- [ ] 读取不同工具生成的 PEM 文件
- [ ] 不同格式变体的兼容性

## 依赖项

### 新增依赖

- ASN.1 编码/解码库（考虑使用 `@noble/asn1` 或自实现）

### 已有依赖

- `SM2` - SM2 密钥对
- `SM4` - SM4 密钥
- `PBKDF2` - 密钥派生（需要实现）

## 文件结构

```
src/util/io/pem/
  ├── PemObject.ts
  ├── PemReader.ts
  └── PemWriter.ts

src/asn1/
  ├── ASN1Encodable.ts
  ├── ASN1ObjectIdentifier.ts
  ├── ASN1Sequence.ts
  ├── ASN1OctetString.ts
  ├── ASN1Integer.ts
  ├── AlgorithmIdentifier.ts
  ├── DEREncoder.ts
  ├── DERDecoder.ts
  └── GMObjectIdentifiers.ts

src/pkcs/
  ├── PrivateKeyInfo.ts
  ├── EncryptedPrivateKeyInfo.ts
  └── PKCS8KeyEncoder.ts

src/x509/
  └── SubjectPublicKeyInfo.ts

src/crypto/encoders/
  ├── SM2PrivateKeyEncoder.ts
  ├── SM2PublicKeyEncoder.ts
  └── SM4KeyEncoder.ts

test/unit/pkcs/
  └── PKCS8.test.ts

test/unit/asn1/
  └── ASN1.test.ts

test/graalvm-integration/java/src/test/java/
  └── PKCS8InteropTest.java
```

## 参考资料

1. **RFC 5208** - PKCS #8
2. **RFC 5958** - Asymmetric Key Packages
3. **RFC 7468** - Textual Encodings
4. **RFC 8018** - PKCS #5
5. **GM/T 0009** - SM2密码算法使用规范
6. **GM/T 0015** - SM2数字证书格式规范
7. **Bouncy Castle Java**
   - `org.bouncycastle.pkcs.*`
   - `org.bouncycastle.asn1.*`
   - `org.bouncycastle.util.io.pem.*`

## 优先级

**高** - PEM/PKCS#8 是密钥交换和存储的标准格式，对于实际应用至关重要。

## 预估工作量

- ASN.1 编码/解码：3-4 天
- PEM 读写：1-2 天
- PKCS#8 支持：2-3 天
- SM2/SM4 编码器：2-3 天
- 测试：2-3 天
- 文档：1 天
- **总计：11-16 天**

## 验收标准

- [ ] 实现完整的 PEM 读写功能
- [ ] 实现 PKCS#8 编码/解码
- [ ] 实现 ASN.1 DER 编码/解码
- [ ] 支持 SM2/SM4 密钥转换
- [ ] 通过所有单元测试
- [ ] 与 bc-java/OpenSSL 互操作
- [ ] 代码覆盖率 > 85%
- [ ] 包含完整的 TSDoc 注释
- [ ] 更新 README 和 API 文档

## 相关 Issues

- [ ] #TBD - PEM 格式支持
- [ ] #TBD - PKCS#8 密钥编码
- [ ] #TBD - ASN.1 DER 编解码

## 后续工作

完成后可以支持：
- X.509 证书解析
- 证书请求（CSR）生成
- 密钥库（Keystore）格式
- TLS 客户端/服务器
