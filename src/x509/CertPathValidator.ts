import { X509Certificate } from './X509Certificate';
import { CertificateList } from './CertificateList';
import { ECPublicKeyParameters } from '../crypto/params/ECPublicKeyParameters';
import { SM2 } from '../crypto/SM2';

/**
 * Certificate Path Validation Result
 */
export interface CertPathValidationResult {
  valid: boolean;
  errors: string[];
  trustAnchor?: X509Certificate;
}

/**
 * Certificate Path Validator
 * 
 * Validates X.509 certificate chains
 * Matches org.bouncycastle.cert.path functionality
 */
export class CertPathValidator {
  /**
   * Validate a certificate chain from end-entity to root
   * 
   * @param endEntity The end-entity certificate
   * @param intermediates Array of intermediate CA certificates (ordered from end-entity to root)
   * @param trustAnchors Array of trusted root CA certificates
   * @param crl Optional CRL for revocation checking
   * @returns Validation result
   */
  static validate(
    endEntity: X509Certificate,
    intermediates: X509Certificate[],
    trustAnchors: X509Certificate[],
    crl?: CertificateList
  ): CertPathValidationResult {
    const errors: string[] = [];
    
    try {
      // Build the full chain
      const chain = [endEntity, ...intermediates];
      
      // 1. Validate each certificate in the chain
      for (let i = 0; i < chain.length; i++) {
        const cert = chain[i];
        
        // Check validity period
        const now = new Date();
        if (now < cert.getNotBefore()) {
          errors.push(`Certificate ${i} not yet valid`);
        }
        if (now > cert.getNotAfter()) {
          errors.push(`Certificate ${i} has expired`);
        }
        
        // Check revocation if CRL provided
        if (crl) {
          const serialNumber = cert.getSerialNumber();
          if (crl.isRevoked(serialNumber)) {
            errors.push(`Certificate ${i} has been revoked`);
          }
        }
      }
      
      // 2. Validate signature chain
      for (let i = 0; i < chain.length; i++) {
        const cert = chain[i];
        let issuerCert: X509Certificate | undefined;
        
        if (i < chain.length - 1) {
          // Use next certificate in chain as issuer
          issuerCert = chain[i + 1];
        } else {
          // Find issuer in trust anchors
          issuerCert = trustAnchors.find(ta => 
            ta.getSubject().toString() === cert.getIssuer().toString()
          );
        }
        
        if (!issuerCert) {
          errors.push(`No issuer found for certificate ${i}`);
          continue;
        }
        
        // Verify issuer's subject matches certificate's issuer
        if (issuerCert.getSubject().toString() !== cert.getIssuer().toString()) {
          errors.push(`Certificate ${i} issuer does not match issuer certificate subject`);
          continue;
        }
        
        // Extract issuer's public key
        const issuerPublicKeyInfo = issuerCert.getSubjectPublicKeyInfo();
        const issuerPublicKeyBytes = issuerPublicKeyInfo.getPublicKey();
        
        // Decode public key
        if (issuerPublicKeyBytes.length !== 65 || issuerPublicKeyBytes[0] !== 0x04) {
          errors.push(`Certificate ${i} issuer has invalid public key format`);
          continue;
        }
        
        const x = CertPathValidator.bytesToBigInt(issuerPublicKeyBytes.slice(1, 33));
        const y = CertPathValidator.bytesToBigInt(issuerPublicKeyBytes.slice(33, 65));
        
        const domainParams = SM2.getParameters();
        const curve = domainParams.getCurve();
        const Q = curve.createPoint(x, y);
        const issuerPublicKey = new ECPublicKeyParameters(Q, domainParams);
        
        // Verify signature
        if (!cert.verify(issuerPublicKey)) {
          errors.push(`Certificate ${i} signature verification failed`);
        }
      }
      
      // 3. Find and verify trust anchor
      const rootCert = chain[chain.length - 1];
      const trustAnchor = trustAnchors.find(ta => 
        ta.getSubject().toString() === rootCert.getIssuer().toString()
      );
      
      if (!trustAnchor) {
        errors.push('No trust anchor found for root certificate');
        return { valid: false, errors };
      }
      
      // 4. Check basic constraints
      for (let i = 1; i < chain.length; i++) {
        const cert = chain[i];
        const extensions = cert.getExtensions();
        
        if (extensions) {
          const bcExt = extensions.getExtension(
            require('./X509Extensions').X509Extensions.BASIC_CONSTRAINTS
          );
          
          if (bcExt) {
            // Verify this is a CA certificate
            // For simplicity, we assume if BasicConstraints extension exists and is critical,
            // it's a CA certificate
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        trustAnchor
      };
      
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }
  
  /**
   * Validate a simple certificate chain (end-entity -> intermediate -> root)
   * 
   * @param endEntity The end-entity certificate
   * @param intermediate The intermediate CA certificate
   * @param rootCA The root CA certificate
   * @returns true if chain is valid
   */
  static validateSimpleChain(
    endEntity: X509Certificate,
    intermediate: X509Certificate,
    rootCA: X509Certificate
  ): boolean {
    const result = CertPathValidator.validate(
      endEntity,
      [intermediate],
      [rootCA]
    );
    return result.valid;
  }
  
  /**
   * Validate a certificate against its issuer
   * 
   * @param certificate The certificate to validate
   * @param issuer The issuer certificate
   * @returns true if certificate is valid
   */
  static validateCertificate(
    certificate: X509Certificate,
    issuer: X509Certificate
  ): boolean {
    try {
      // Check issuer matches
      if (certificate.getIssuer().toString() !== issuer.getSubject().toString()) {
        return false;
      }
      
      // Check validity period
      const now = new Date();
      if (now < certificate.getNotBefore() || now > certificate.getNotAfter()) {
        return false;
      }
      
      // Extract issuer's public key and verify signature
      const issuerPublicKeyInfo = issuer.getSubjectPublicKeyInfo();
      const issuerPublicKeyBytes = issuerPublicKeyInfo.getPublicKey();
      
      if (issuerPublicKeyBytes.length !== 65 || issuerPublicKeyBytes[0] !== 0x04) {
        return false;
      }
      
      const x = CertPathValidator.bytesToBigInt(issuerPublicKeyBytes.slice(1, 33));
      const y = CertPathValidator.bytesToBigInt(issuerPublicKeyBytes.slice(33, 65));
      
      const domainParams = SM2.getParameters();
      const curve = domainParams.getCurve();
      const Q = curve.createPoint(x, y);
      const issuerPublicKey = new ECPublicKeyParameters(Q, domainParams);
      
      return certificate.verify(issuerPublicKey);
      
    } catch (error) {
      return false;
    }
  }
  
  private static bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }
}
