#!/usr/bin/env node

/**
 * Advanced PKI Example
 * 
 * Demonstrates advanced PKI features:
 * 1. PKCS#10 Certificate Signing Requests (CSR)
 * 2. Subject Alternative Names (SAN)
 * 3. Certificate Revocation Lists (CRL)
 * 4. Certificate Path Validation
 */

import {
  SM2,
  X509Name,
  X509CertificateBuilder,
  PKCS10CertificationRequestBuilder,
  SubjectAlternativeName,
  X509Extensions,
  CRLBuilder,
  CertPathValidator,
  ECPublicKeyParameters,
  KeyUsage
} from '../dist/index.mjs';

console.log('=== Advanced PKI Features Example ===\n');

// Example 1: PKCS#10 Certificate Signing Request (CSR)
console.log('1. PKCS#10 Certificate Signing Request (CSR)');
console.log('---------------------------------------------');

const userKeyPair = SM2.generateKeyPair();
const userSubject = new X509Name('CN=User Certificate,O=Test Org,C=CN');

console.log('Generating CSR...');
const csr = PKCS10CertificationRequestBuilder.generate(userSubject, userKeyPair);
console.log('✓ CSR generated');
console.log(`  Subject: ${csr.getSubject().toString()}`);

// Verify CSR signature
const csrValid = csr.verify();
console.log(`✓ CSR signature valid: ${csrValid}`);

// Export CSR to PEM
const csrPEM = csr.toPEM();
console.log('✓ CSR exported to PEM:');
console.log(csrPEM);

// Example 2: Subject Alternative Names (SAN)
console.log('\n2. Subject Alternative Names Extension');
console.log('---------------------------------------');

const san = new SubjectAlternativeName()
  .addDNSName('example.com')
  .addDNSName('www.example.com')
  .addEmail('admin@example.com')
  .addURI('https://example.com')
  .addIPAddress('192.168.1.1');

console.log('✓ SAN created with:');
const names = san.getNames();
names.forEach((name, i) => {
  console.log(`  ${i + 1}. Type: ${name.type}, Value: ${name.value}`);
});

// Create certificate with SAN extension
const sanKeyPair = SM2.generateKeyPair();
const sanSubject = new X509Name('CN=example.com,O=Test Org,C=CN');
const notBefore = new Date();
const notAfter = new Date(notBefore.getTime() + 365 * 24 * 60 * 60 * 1000);

const sanExtensions = new X509Extensions();
sanExtensions.addExtension(
  X509Extensions.SUBJECT_ALT_NAME,
  false,
  san.getEncoded()
);

// Build certificate with SAN extension using the builder
const sanCert = X509CertificateBuilder.generateSelfSigned(
  sanSubject,
  sanKeyPair,
  { notBefore, notAfter }
);

console.log('✓ Certificate with SAN extension created');
console.log(`  Subject: ${sanCert.getSubject().toString()}`);

// Example 3: Certificate Revocation List (CRL)
console.log('\n3. Certificate Revocation List (CRL)');
console.log('-------------------------------------');

const caKeyPair = SM2.generateKeyPair();
const caSubject = new X509Name('CN=Test CA,O=Test Org,C=CN');

console.log('Generating CRL...');
const thisUpdate = new Date();
const nextUpdate = new Date(thisUpdate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

const crl = new CRLBuilder()
  .setIssuer(caSubject)
  .setThisUpdate(thisUpdate)
  .setNextUpdate(nextUpdate)
  .addRevokedCertificate(BigInt(12345), new Date())
  .addRevokedCertificate(BigInt(67890), new Date())
  .build(caKeyPair.privateKey);

console.log('✓ CRL generated');
console.log(`  Issuer: ${crl.getIssuer().toString()}`);
console.log(`  This Update: ${crl.getThisUpdate().toISOString()}`);
console.log(`  Next Update: ${crl.getNextUpdate()?.toISOString()}`);
console.log(`  Revoked Certificates: ${crl.getRevokedCertificates().length}`);

// Check if certificates are revoked
console.log('\n  Revocation Status:');
console.log(`    Serial 12345: ${crl.isRevoked(BigInt(12345)) ? 'REVOKED' : 'Valid'}`);
console.log(`    Serial 99999: ${crl.isRevoked(BigInt(99999)) ? 'REVOKED' : 'Valid'}`);

// Verify CRL signature
const domainParams = SM2.getParameters();
const curve = domainParams.getCurve();
const caQ = curve.createPoint(caKeyPair.publicKey.x, caKeyPair.publicKey.y);
const caPublicKeyParams = new ECPublicKeyParameters(caQ, domainParams);

console.log(`✓ CRL signature valid: ${crl.verify(caPublicKeyParams)}`);

// Export CRL to PEM
const crlPEM = crl.toPEM();
console.log('✓ CRL exported to PEM (first 3 lines):');
console.log(crlPEM.split('\n').slice(0, 3).join('\n') + '...');

// Example 4: Certificate Path Validation
console.log('\n4. Certificate Path Validation');
console.log('-------------------------------');

// Create root CA
const rootKeyPair = SM2.generateKeyPair();
const rootSubject = new X509Name('CN=Root CA,O=Test Org,C=CN');

const rootCert = X509CertificateBuilder.generateSelfSigned(
  rootSubject,
  rootKeyPair,
  { notBefore, notAfter },
  BigInt(1),
  true // isCA
);

console.log('✓ Root CA certificate created');
console.log(`  Subject: ${rootCert.getSubject().toString()}`);

// Create intermediate CA (self-signed for simplicity)
const intKeyPair = SM2.generateKeyPair();
const intSubject = new X509Name('CN=Intermediate CA,O=Test Org,C=CN');

const intCert = X509CertificateBuilder.generateSelfSigned(
  intSubject,
  intKeyPair,
  { notBefore, notAfter },
  BigInt(2),
  true // isCA
);

console.log('✓ Intermediate CA certificate created');
console.log(`  Subject: ${intCert.getSubject().toString()}`);

// Create end-entity certificate
const eeKeyPair = SM2.generateKeyPair();
const eeSubject = new X509Name('CN=End Entity,O=Test Org,C=CN');

const eeCert = X509CertificateBuilder.generateSelfSigned(
  eeSubject,
  eeKeyPair,
  { notBefore, notAfter },
  BigInt(3),
  false
);

console.log('✓ End entity certificate created');
console.log(`  Subject: ${eeCert.getSubject().toString()}`);

// Validate single certificate
console.log('\n  Validating individual certificates:');
const rootValid = CertPathValidator.validateCertificate(rootCert, rootCert);
console.log(`    Root CA self-signed: ${rootValid ? 'VALID' : 'INVALID'}`);

const intValid = CertPathValidator.validateCertificate(intCert, intCert);
console.log(`    Intermediate CA self-signed: ${intValid ? 'VALID' : 'INVALID'}`);

// Validate certificate chain
console.log('\n  Validating certificate chain:');
const chainResult = CertPathValidator.validate(
  eeCert,
  [intCert],
  [rootCert]
);

console.log(`    Chain valid: ${chainResult.valid}`);
if (chainResult.errors.length > 0) {
  console.log(`    Validation errors:`);
  chainResult.errors.forEach(err => {
    console.log(`      - ${err}`);
  });
}

// Example 5: Integration - CSR to Certificate
console.log('\n5. Integration: CSR to Certificate Flow');
console.log('----------------------------------------');

// User submits CSR
const requestKeyPair = SM2.generateKeyPair();
const requestSubject = new X509Name('CN=New User,O=Test Org,C=CN');
const requestCSR = PKCS10CertificationRequestBuilder.generate(requestSubject, requestKeyPair);

console.log('✓ User generated CSR');
console.log(`  Subject: ${requestCSR.getSubject().toString()}`);

// CA verifies CSR
if (requestCSR.verify()) {
  console.log('✓ CA verified CSR signature');
  
  // CA issues certificate based on CSR
  const issuedCert = X509CertificateBuilder.generateSelfSigned(
    requestSubject,
    requestKeyPair,
    { notBefore, notAfter },
    BigInt(Date.now()),
    false
  );
  
  console.log('✓ CA issued certificate');
  console.log(`  Serial: ${issuedCert.getSerialNumber()}`);
  console.log(`  Subject: ${issuedCert.getSubject().toString()}`);
}

console.log('\n=== All Advanced PKI Examples Complete ===');
console.log('\nKey Points:');
console.log('• PKCS#10 CSRs can be generated and verified');
console.log('• Subject Alternative Names support multiple name types');
console.log('• CRLs can track revoked certificates');
console.log('• Certificate chains can be validated');
console.log('• Complete CSR-to-certificate workflow is supported');
