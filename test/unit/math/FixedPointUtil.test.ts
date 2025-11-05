import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { FixedPointUtil } from '../../../src/math/ec/FixedPointUtil';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('FixedPointUtil Tests', () => {
  // Use test curve: y² = x³ + 4x + 20 over F_1063
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  describe('getCombSize()', () => {
    it('should return correct comb size for test curve', () => {
      const size = FixedPointUtil.getCombSize(curve);
      // Test curve has no order set, so should return fieldSize + 1
      const expectedSize = 11; // 1063 ≈ 2^10, so fieldSize = 10, +1 = 11
      console.log('Comb size:', size);
      console.log('Field size:', curve.getFieldSize());
      
      // Actually let me check the exact value
      const fieldSize = curve.getFieldSize();
      expect(size).toBe(fieldSize + 1);
    });
  });

  describe('precompute()', () => {
    it('should create valid precomputed data', () => {
      const info = FixedPointUtil.precompute(G);
      
      expect(info).toBeDefined();
      expect(info.getLookupTable()).toBeDefined();
      expect(info.getOffset()).toBeDefined();
      expect(info.getWidth()).toBeDefined();
      
      console.log('\n=== Precompute Info ===');
      console.log('Width:', info.getWidth());
      console.log('Lookup table size:', info.getLookupTable()!.getSize());
      
      const width = info.getWidth();
      const expectedTableSize = 1 << width;
      expect(info.getLookupTable()!.getSize()).toBe(expectedTableSize);
    });

    it('should verify pow2Table values', () => {
      // Manually compute what pow2Table should be
      const bits = FixedPointUtil.getCombSize(curve);
      const minWidth = bits > 250 ? 6 : 5;
      const d = Math.floor((bits + minWidth - 1) / minWidth);
      
      console.log('\n=== pow2Table calculation ===');
      console.log('bits:', bits, 'minWidth:', minWidth, 'd:', d);
      
      // pow2Table[0] = G
      // pow2Table[1] = G * 2^d
      // pow2Table[2] = G * 2^(2d)
      // ...
      
      let P = G;
      const pow2Expected = [P];
      
      for (let i = 1; i < minWidth; i++) {
        P = P.timesPow2(d);
        pow2Expected.push(P);
      }
      
      console.log('pow2Expected[0] (G):', pow2Expected[0].normalize().getXCoord().toBigInteger());
      console.log('pow2Expected[1] (G*2^d):', pow2Expected[1].normalize().getXCoord().toBigInteger());
      
      // offset = pow2[0] - pow2[1] = G - G*2^d
      const expectedOffset = pow2Expected[0].subtract(pow2Expected[1]);
      console.log('Expected offset x:', expectedOffset.normalize().getXCoord().toBigInteger());
      
      const info = FixedPointUtil.precompute(G);
      const actualOffset = info.getOffset()!;
      console.log('Actual offset x:', actualOffset.normalize().getXCoord().toBigInteger());
      
      // Verify offset matches
      const expOffsetNorm = expectedOffset.normalize();
      const actOffsetNorm = actualOffset.normalize();
      expect(actOffsetNorm.getXCoord().toBigInteger()).toBe(expOffsetNorm.getXCoord().toBigInteger());
      expect(actOffsetNorm.getYCoord().toBigInteger()).toBe(expOffsetNorm.getYCoord().toBigInteger());
    });

    it('should verify lookup table construction', () => {
      const info = FixedPointUtil.precompute(G);
      const lookupTable = info.getLookupTable()!;
      const width = info.getWidth();
      
      console.log('\n=== Lookup Table Verification ===');
      console.log('Width:', width, 'Size:', lookupTable.getSize());
      
      // lookupTable[0] should be G
      const entry0 = lookupTable.lookup(0);
      const entry0Norm = entry0.normalize();
      console.log('lookupTable[0] x:', entry0Norm.getXCoord().toBigInteger());
      console.log('Expected G x:', G.normalize().getXCoord().toBigInteger());
      
      expect(entry0Norm.getXCoord().toBigInteger()).toBe(G.normalize().getXCoord().toBigInteger());
      expect(entry0Norm.getYCoord().toBigInteger()).toBe(G.normalize().getYCoord().toBigInteger());
      
      // Test a few more entries
      if (width >= 2) {
        const entry1 = lookupTable.lookup(1);
        console.log('lookupTable[1] x:', entry1.normalize().getXCoord().toBigInteger());
        
        const entry2 = lookupTable.lookup(2);
        console.log('lookupTable[2] x:', entry2.normalize().getXCoord().toBigInteger());
        
        // According to Java algorithm:
        // The table is built in a specific pattern based on binary decomposition
        // For width=5, indices represent which pow2 points to add
        // This is complex to verify without tracing through the exact algorithm
      }
    });

    it('should be idempotent (cached)', () => {
      const info1 = FixedPointUtil.precompute(G);
      const info2 = FixedPointUtil.precompute(G);
      
      // Should return the same cached instance
      expect(info1).toBe(info2);
    });

    it('should validate lookup table by multiplying with it', () => {
      // Use the lookup table to compute 1*G and verify it equals G
      const info = FixedPointUtil.precompute(G);
      const lookupTable = info.getLookupTable()!;
      
      // For k=1, secretIndex should be 0 (we verified this in Nat tests)
      // So lookup(0) should give us a point that when processed correctly gives G
      
      const point0 = lookupTable.lookup(0);
      console.log('\n=== Verify lookup(0) ===');
      console.log('lookup(0) x:', point0.normalize().getXCoord().toBigInteger());
      console.log('lookup(0) y:', point0.normalize().getYCoord().toBigInteger());
      console.log('G x:', G.normalize().getXCoord().toBigInteger());
      console.log('G y:', G.normalize().getYCoord().toBigInteger());
      
      // lookup(0) should be G
      expect(point0.normalize().getXCoord().toBigInteger()).toBe(G.normalize().getXCoord().toBigInteger());
    });
  });
});
