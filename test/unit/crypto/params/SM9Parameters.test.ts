import { describe, it, expect } from 'vitest';
import { SM9Parameters, SM9DomainParameters } from '../../../../src/crypto/params/SM9Parameters';

describe('SM9Parameters', () => {
  describe('Constants', () => {
    it('should have correct prime modulus', () => {
      expect(SM9Parameters.P).toBeGreaterThan(0n);
      expect(SM9Parameters.P.toString(16).length).toBeGreaterThan(60); // 256-bit number
    });

    it('should have correct order', () => {
      expect(SM9Parameters.N).toBeGreaterThan(0n);
      expect(SM9Parameters.N).toBeLessThan(SM9Parameters.P);
    });

    it('should have embedding degree 12', () => {
      expect(SM9Parameters.EMBEDDING_DEGREE).toBe(12);
    });

    it('should have correct curve parameters', () => {
      expect(SM9Parameters.A).toBe(0n);
      expect(SM9Parameters.B).toBe(5n);
    });
  });

  describe('Generator points', () => {
    it('should have valid P1 coordinates', () => {
      expect(SM9Parameters.P1_X).toBeGreaterThan(0n);
      expect(SM9Parameters.P1_Y).toBeGreaterThan(0n);
      expect(SM9Parameters.P1_X).toBeLessThan(SM9Parameters.P);
      expect(SM9Parameters.P1_Y).toBeLessThan(SM9Parameters.P);
    });

    it('should have valid P2 coordinates', () => {
      expect(SM9Parameters.P2_X0).toBeGreaterThan(0n);
      expect(SM9Parameters.P2_X1).toBeGreaterThan(0n);
      expect(SM9Parameters.P2_Y0).toBeGreaterThan(0n);
      expect(SM9Parameters.P2_Y1).toBeGreaterThan(0n);
    });

    it('should have P1 coordinates defined', () => {
      expect(SM9Parameters.P1_X).toBeDefined();
      expect(SM9Parameters.P1_Y).toBeDefined();
    });

    it('should create P2 coordinates', () => {
      const p2Coords = SM9Parameters.getP2Coordinates();
      
      expect(p2Coords.x).toBeDefined();
      expect(p2Coords.y).toBeDefined();
      expect(p2Coords.x.getP()).toBe(SM9Parameters.P);
      expect(p2Coords.y.getP()).toBe(SM9Parameters.P);
    });
  });

  describe('Hash function identifiers', () => {
    it('should have correct HID values', () => {
      expect(SM9Parameters.HID_SIGN).toBe(0x01);
      expect(SM9Parameters.HID_ENC).toBe(0x02);
      expect(SM9Parameters.HID_EXCH).toBe(0x03);
    });
  });

  describe('getCurve', () => {
    it('should return valid curve', () => {
      const curve = SM9Parameters.getCurve();
      
      expect(curve).toBeDefined();
    });
  });
});

describe('SM9DomainParameters', () => {
  it('should have correct domain parameters', () => {
    expect(SM9Parameters.N).toBeDefined();
    expect(SM9Parameters.P).toBeDefined();
    expect(SM9Parameters.N).toBeLessThan(SM9Parameters.P);
  });
});
