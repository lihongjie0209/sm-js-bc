# X.509 证书支持需求

## 概述

实现 X.509 证书的解析、验证和生成功能，支持 SM2 证书，参考 Bouncy Castle Java 的实现。

## 背景

X.509 是定义公钥证书格式的国际标准（ITU-T X.509），广泛用于 TLS/SSL、代码签名、电子邮件加密等场景。GM/T 0015 定义了基于 SM2 的数字证书格式规范，是 X.509 在国密领域的应用。

## 功能需求

### 1. X.509 证书解析

参考：`org.bouncycastle.asn1.x509.Certificate`

#### 1.1 证书结构

```typescript
/**
 * X.509 证书
 * 
 * Certificate ::= SEQUENCE {
 *   tbsCertificate       TBSCertificate,
 *   signatureAlgorithm   AlgorithmIdentifier,
 *   signatureValue       BIT STRING
 * }
 */
class X509Certificate {
  constructor(
    public readonly tbsCertificate: TBSCertificate,
    public readonly signatureAlgorithm: AlgorithmIdentifier,
    public readonly signatureValue: Uint8Array
  );
  
  /**
   * 获取证书版本
   */
  getVersion(): number;
  
  /**
   * 获取序列号
   */
  getSerialNumber(): bigint;
  
  /**
   * 获取签发者
   */
  getIssuer(): X509Name;
  
  /**
   * 获取主体
   */
  getSubject(): X509Name;
  
  /**
   * 获取公钥
   */
  getPublicKey(): SubjectPublicKeyInfo;
  
  /**
   * 获取有效期开始时间
   */
  getNotBefore(): Date;
  
  /**
   * 获取有效期结束时间
   */
  getNotAfter(): Date;
  
  /**
   * 获取扩展
   */
  getExtensions(): X509Extensions;
  
  /**
   * 验证证书签名
   */
  verify(publicKey: ECPublicKeyParameters): boolean;
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): X509Certificate;
  
  /**
   * 从 PEM 解码
   */
  static fromPEM(pem: string): X509Certificate;
}
```

#### 1.2 TBSCertificate（待签名证书）

```typescript
/**
 * TBSCertificate ::= SEQUENCE {
 *   version         [0]  Version DEFAULT v1,
 *   serialNumber         CertificateSerialNumber,
 *   signature            AlgorithmIdentifier,
 *   issuer               Name,
 *   validity             Validity,
 *   subject              Name,
 *   subjectPublicKeyInfo SubjectPublicKeyInfo,
 *   extensions      [3]  Extensions OPTIONAL
 * }
 */
class TBSCertificate {
  constructor(
    public readonly version: number,
    public readonly serialNumber: bigint,
    public readonly signature: AlgorithmIdentifier,
    public readonly issuer: X509Name,
    public readonly validity: Validity,
    public readonly subject: X509Name,
    public readonly subjectPublicKeyInfo: SubjectPublicKeyInfo,
    public readonly extensions?: X509Extensions
  );
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
}
```

#### 1.3 有效期

```typescript
/**
 * Validity ::= SEQUENCE {
 *   notBefore      Time,
 *   notAfter       Time
 * }
 */
class Validity {
  constructor(
    public readonly notBefore: Date,
    public readonly notAfter: Date
  );
  
  /**
   * 检查当前时间是否在有效期内
   */
  isValid(date: Date = new Date()): boolean;
}
```

#### 1.4 X.509 名称

```typescript
/**
 * X.509 主体/签发者名称
 * 
 * Name ::= CHOICE {
 *   rdnSequence  RDNSequence
 * }
 * 
 * RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
 */
class X509Name {
  constructor(name: string | Map<ASN1ObjectIdentifier, string>);
  
  /**
   * 获取 CN (Common Name)
   */
  getCommonName(): string | null;
  
  /**
   * 获取 O (Organization)
   */
  getOrganization(): string | null;
  
  /**
   * 获取 C (Country)
   */
  getCountry(): string | null;
  
  /**
   * 转为字符串表示
   */
  toString(): string;
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): X509Name;
}
```

### 2. X.509 扩展

参考：`org.bouncycastle.asn1.x509.Extensions`

#### 2.1 扩展结构

```typescript
/**
 * Extensions ::= SEQUENCE SIZE (1..MAX) OF Extension
 * 
 * Extension ::= SEQUENCE {
 *   extnID      OBJECT IDENTIFIER,
 *   critical    BOOLEAN DEFAULT FALSE,
 *   extnValue   OCTET STRING
 * }
 */
class X509Extensions {
  /**
   * 添加扩展
   */
  addExtension(oid: ASN1ObjectIdentifier, critical: boolean, value: Uint8Array): void;
  
  /**
   * 获取扩展
   */
  getExtension(oid: ASN1ObjectIdentifier): X509Extension | null;
  
  /**
   * 获取所有扩展
   */
  getAllExtensions(): X509Extension[];
}

class X509Extension {
  constructor(
    public readonly oid: ASN1ObjectIdentifier,
    public readonly critical: boolean,
    public readonly value: Uint8Array
  );
}
```

#### 2.2 常用扩展

```typescript
/**
 * 密钥用途扩展
 */
enum KeyUsage {
  digitalSignature = 0x80,
  nonRepudiation = 0x40,
  keyEncipherment = 0x20,
  dataEncipherment = 0x10,
  keyAgreement = 0x08,
  keyCertSign = 0x04,
  cRLSign = 0x02,
  encipherOnly = 0x01,
  decipherOnly = 0x8000
}

/**
 * 基本约束扩展
 */
class BasicConstraints {
  constructor(
    public readonly isCA: boolean,
    public readonly pathLenConstraint?: number
  );
}

/**
 * 主体备用名称扩展
 */
class SubjectAlternativeNames {
  private names: Array<{type: number, value: string}>;
  
  addDNSName(dns: string): void;
  addEmail(email: string): void;
  addIPAddress(ip: string): void;
}
```

### 3. 证书生成器

参考：`org.bouncycastle.cert.X509v3CertificateBuilder`

#### 3.1 证书生成

```typescript
/**
 * X.509 v3 证书生成器
 */
class X509CertificateBuilder {
  /**
   * 设置证书版本
   */
  setVersion(version: number): this;
  
  /**
   * 设置序列号
   */
  setSerialNumber(serialNumber: bigint): this;
  
  /**
   * 设置签发者
   */
  setIssuer(issuer: X509Name): this;
  
  /**
   * 设置主体
   */
  setSubject(subject: X509Name): this;
  
  /**
   * 设置有效期
   */
  setValidity(notBefore: Date, notAfter: Date): this;
  
  /**
   * 设置公钥
   */
  setPublicKey(publicKey: SubjectPublicKeyInfo): this;
  
  /**
   * 添加扩展
   */
  addExtension(
    oid: ASN1ObjectIdentifier,
    critical: boolean,
    value: Uint8Array
  ): this;
  
  /**
   * 生成证书
   */
  build(signerKey: ECPrivateKeyParameters): X509Certificate;
}
```

#### 3.2 自签名证书

```typescript
/**
 * 生成自签名证书
 */
class SelfSignedCertificateGenerator {
  /**
   * 生成自签名 SM2 证书
   */
  static generateSM2(
    subject: X509Name,
    keyPair: { privateKey: bigint, publicKey: ECPoint },
    validity: { notBefore: Date, notAfter: Date }
  ): X509Certificate;
}
```

### 4. 证书验证

参考：`org.bouncycastle.cert.X509CertificateHolder`

#### 4.1 验证逻辑

```typescript
/**
 * 证书验证器
 */
class X509CertificateValidator {
  /**
   * 验证证书签名
   */
  verifySignature(
    certificate: X509Certificate,
    issuerPublicKey: ECPublicKeyParameters
  ): boolean;
  
  /**
   * 验证证书有效期
   */
  verifyValidity(
    certificate: X509Certificate,
    date: Date = new Date()
  ): boolean;
  
  /**
   * 验证证书链
   */
  verifyCertificateChain(
    chain: X509Certificate[],
    trustAnchors: X509Certificate[]
  ): boolean;
  
  /**
   * 验证证书路径
   */
  verifyPath(
    endEntity: X509Certificate,
    intermediates: X509Certificate[],
    rootCA: X509Certificate
  ): boolean;
}
```

### 5. 证书请求（CSR）

参考：`org.bouncycastle.pkcs.PKCS10CertificationRequest`

#### 5.1 PKCS#10 CSR

```typescript
/**
 * PKCS#10 证书请求
 * 
 * CertificationRequest ::= SEQUENCE {
 *   certificationRequestInfo  CertificationRequestInfo,
 *   signatureAlgorithm        AlgorithmIdentifier,
 *   signature                 BIT STRING
 * }
 */
class PKCS10CertificationRequest {
  constructor(
    public readonly certificationRequestInfo: CertificationRequestInfo,
    public readonly signatureAlgorithm: AlgorithmIdentifier,
    public readonly signature: Uint8Array
  );
  
  /**
   * 获取主体
   */
  getSubject(): X509Name;
  
  /**
   * 获取公钥
   */
  getPublicKey(): SubjectPublicKeyInfo;
  
  /**
   * 验证签名
   */
  verify(): boolean;
  
  /**
   * 编码为 DER
   */
  getEncoded(): Uint8Array;
  
  /**
   * 从 DER 解码
   */
  static fromEncoded(encoded: Uint8Array): PKCS10CertificationRequest;
}
```

#### 5.2 CSR 生成器

```typescript
/**
 * PKCS#10 CSR 生成器
 */
class PKCS10CertificationRequestBuilder {
  /**
   * 设置主体
   */
  setSubject(subject: X509Name): this;
  
  /**
   * 设置公钥
   */
  setPublicKey(publicKey: SubjectPublicKeyInfo): this;
  
  /**
   * 添加属性
   */
  addAttribute(
    oid: ASN1ObjectIdentifier,
    value: Uint8Array
  ): this;
  
  /**
   * 生成 CSR
   */
  build(privateKey: ECPrivateKeyParameters): PKCS10CertificationRequest;
}
```

## 技术规范

### 标准文档

- **RFC 5280** - X.509 Public Key Infrastructure Certificate and CRL Profile
- **RFC 2986** - PKCS #10: Certification Request Syntax Specification
- **GM/T 0015-2012** - 基于SM2密码算法的数字证书格式规范
- **GM/T 0009-2012** - SM2密码算法使用规范

### 证书格式

- **编码**: DER 或 PEM
- **版本**: v3 (0x02)
- **签名算法**: SM2-with-SM3 (OID: 1.2.156.10197.1.501)

## 实现要点

### 1. 与标准保持一致

- 遵循 RFC 5280 和 GM/T 0015
- 支持标准扩展
- 正确处理 ASN.1 编码

### 2. 安全考虑

- 验证证书链
- 检查证书吊销状态（如果可用）
- 验证密钥用途
- 检查有效期

### 3. 互操作性

- 与 OpenSSL 生成的证书兼容
- 与 Java Keytool 兼容
- 与 GmSSL 兼容

## 测试要求

### 1. 单元测试

- [ ] 证书解析测试
- [ ] 证书生成测试
- [ ] CSR 生成测试
- [ ] 证书验证测试
- [ ] 证书链验证测试
- [ ] 扩展处理测试

### 2. 互操作性测试

- [ ] 解析 OpenSSL 生成的 SM2 证书
- [ ] 解析 GmSSL 生成的证书
- [ ] 与 bc-java 生成的证书对比

### 3. 兼容性测试

- [ ] 不同工具生成的证书
- [ ] 不同版本的证书格式

## 依赖项

### 新增依赖

无

### 已有依赖

- `ASN.1` 编码/解码
- `SM2Signer` - 签名验证
- `SubjectPublicKeyInfo` - 公钥格式

## 文件结构

```
src/x509/
  ├── X509Certificate.ts
  ├── TBSCertificate.ts
  ├── X509Name.ts
  ├── X509Extensions.ts
  ├── Validity.ts
  ├── X509CertificateBuilder.ts
  ├── X509CertificateValidator.ts
  └── SelfSignedCertificateGenerator.ts

src/pkcs/
  ├── PKCS10CertificationRequest.ts
  └── PKCS10CertificationRequestBuilder.ts

test/unit/x509/
  ├── X509Certificate.test.ts
  └── PKCS10.test.ts

test/graalvm-integration/java/src/test/java/
  └── X509InteropTest.java
```

## 参考资料

1. **RFC 5280** - X.509 Certificate Profile
2. **RFC 2986** - PKCS #10
3. **GM/T 0015-2012** - SM2数字证书格式
4. **Bouncy Castle Java**
   - `org.bouncycastle.asn1.x509.*`
   - `org.bouncycastle.cert.*`
   - `org.bouncycastle.pkcs.*`

## 优先级

**中高** - X.509 证书是 PKI 的基础，对于企业应用很重要。

## 预估工作量

- 证书解析：3-4 天
- 证书生成：2-3 天
- 证书验证：2-3 天
- CSR 支持：2 天
- 测试：3-4 天
- 文档：1-2 天
- **总计：13-18 天**

## 验收标准

- [ ] 实现完整的 X.509 证书解析
- [ ] 实现证书生成和签名
- [ ] 实现证书验证和链验证
- [ ] 实现 PKCS#10 CSR
- [ ] 通过所有单元测试
- [ ] 与 OpenSSL/GmSSL 互操作
- [ ] 代码覆盖率 > 85%
- [ ] 包含完整的 TSDoc 注释

## 相关 Issues

- [ ] #TBD - X.509 证书支持
- [ ] #TBD - PKCS#10 CSR 支持

## 后续工作

完成后可以支持：
- CRL（证书吊销列表）
- OCSP（在线证书状态协议）
- TLS 客户端/服务器
- 代码签名
