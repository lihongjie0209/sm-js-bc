import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint'; // Register ECPoint factory
import { FixedPointUtil } from '../../../src/math/ec/FixedPointUtil';

describe('Comb Algorithm Mathematical Analysis', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should understand what the comb algorithm computes', () => {
    // For k=1, binary representation has only bit 0 set
    // d = 3, width = 5
    // 
    // The comb divides the scalar k into d columns:
    // Column 0: bits 14, 11, 8, 5, 2 (top to bottom)
    // Column 1: bits 13, 10, 7, 4, 1
    // Column 2: bits 12, 9, 6, 3, 0  <- bit 0 is here!
    
    // secretIndex for each column is built by reading bits from top to bottom
    // and treating them as a binary number
    
    // For k=1 (only bit 0 is set):
    // Column 0 (i=0): bits 14,11,8,5,2 -> all 0 -> secretIndex = 00000 = 0
    // Column 1 (i=1): bits 13,10,7,4,1 -> all 0 -> secretIndex = 00000 = 0
    // Column 2 (i=2): bits 12,9,6,3,0 -> 00001 -> secretIndex = ?
    
    // Wait, secretIndex is only 5 bits but we're reading 5 positions
    // Let me trace the exact calculation:
    
    const k = 1n;
    const info = FixedPointUtil.getFixedPointPreCompInfo(G);
    const d = 3;
    const width = 5;
    const size = 12; // combSize
    
    // Convert k to K array (little-endian 32-bit words)
    const K = new Array(Math.ceil(size / 32));
    for (let i = 0; i < K.length; i++) {
      K[i] = Number((k >> BigInt(i * 32)) & 0xFFFFFFFFn);
    }
    
    console.log('\nK array:', K);
    console.log('Binary k:', k.toString(2).padStart(size, '0'));
    
    // Trace secretIndex calculation for each column
    const top = size - 1; // 11
    
    for (let i = 0; i < d; i++) {
      let secretIndex = 0;
      const bits = [];
      
      for (let j = top - i; j >= 0; j -= d) {
        const word = K[j >>> 5];
        const secretBit = (word >>> (j & 0x1F)) & 1;
        bits.push(secretBit);
        
        // Java code does:
        // secretIndex ^= secretBit >>> 1;
        // secretIndex <<= 1;
        // secretIndex ^= secretBit;
        
        // This is equivalent to treating bits as MSB-first binary number
        secretIndex = (secretIndex << 1) | secretBit;
      }
      
      console.log(`\nIteration ${i}:`);
      console.log(`  j values: ${Array.from({length: width}, (_, idx) => top - i - idx * d).filter(j => j >= 0).join(',')}`);
      console.log(`  bits: ${bits.join('')}`);
      console.log(`  secretIndex: ${secretIndex}`);
    }
  });

  it('should verify what the algorithm mathematically computes', () => {
    // The comb algorithm computes:
    // result = sum_{i=0}^{d-1} (lookupTable[secretIndex_i] * 2^i)
    // 
    // But wait, that's not what the code does!
    // The code does:
    // R = infinity
    // for i = 0 to d-1:
    //   R = R.twicePlus(lookupTable[secretIndex_i])
    //   = 2*R + lookupTable[secretIndex_i]
    // return R + offset
    
    // Let's expand this:
    // After iter 0: R = 2*0 + lookup[s0] = lookup[s0]
    // After iter 1: R = 2*lookup[s0] + lookup[s1]
    // After iter 2: R = 2*(2*lookup[s0] + lookup[s1]) + lookup[s2]
    //              = 4*lookup[s0] + 2*lookup[s1] + lookup[s2]
    // After iter 3: R = 8*lookup[s0] + 4*lookup[s1] + 2*lookup[s2] + lookup[s3]
    // ...
    
    // For d=3:
    // R = 4*lookup[s0] + 2*lookup[s1] + lookup[s2]
    
    // For k=1, we have s0=0, s1=0, s2=1:
    // R = 4*lookup[0] + 2*lookup[0] + lookup[1]
    //   = 4*G + 2*G + 2*G  (since lookup[0]=G, lookup[1]=2*G)
    //   = 8*G
    
    // Then: result = R + offset = 8*G + (G - 8*G) = G  ✓
    
    console.log('\nExpected computation for k=1:');
    console.log('  R = 4*lookup[0] + 2*lookup[0] + lookup[1]');
    console.log('    = 4*G + 2*G + 2*G');
    console.log('    = 8*G');
    
    const eightG = G.timesPow2(3);
    console.log('  8*G x =', eightG.normalize().getXCoord().toBigInteger());
    
    // offset = G - 8*G = G + (-8*G)
    const offset = G.add(eightG.negate());
    console.log('  offset x =', offset.normalize().getXCoord().toBigInteger());
    
    // result = 8*G + offset = 8*G + (G - 8*G) = G
    const result = eightG.add(offset);
    console.log('  result x =', result.normalize().getXCoord().toBigInteger());
    console.log('  Expected G x = 1');
    
    expect(result.normalize().getXCoord().toBigInteger()).toBe(1n);
  });

  it('should trace what our code actually computes', () => {
    // First precompute
    const info = FixedPointUtil.precompute(G as any);
    if (!info) throw new Error('precompute() returned null');
    
    const lookupTable = info.getLookupTable();
    const offset = info.getOffset();
    if (!lookupTable || !offset) throw new Error('LookupTable or offset is null');
    
    console.log('\nActual computation trace:');
    console.log('lookup[0] x =', lookupTable.lookup(0).normalize().getXCoord().toBigInteger());
    console.log('lookup[1] x =', lookupTable.lookup(1).normalize().getXCoord().toBigInteger());
    console.log('offset x =', offset.normalize().getXCoord().toBigInteger());
    
    // Iteration 0: secretIndex = 0
    let R = curve.getInfinity();
    const add0 = lookupTable.lookup(0);
    R = R.twicePlus(add0);
    console.log('\nAfter iter 0: R x =', R.normalize().getXCoord().toBigInteger(), '(expected G = 1)');
    
    // Iteration 1: secretIndex = 0
    const add1 = lookupTable.lookup(0);
    R = R.twicePlus(add1);
    console.log('After iter 1: R x =', R.normalize().getXCoord().toBigInteger(), '(expected 2*G + G = 3*G = 54)');
    
    // Iteration 2: secretIndex = 1
    const add2 = lookupTable.lookup(1);
    R = R.twicePlus(add2);
    console.log('After iter 2: R x =', R.normalize().getXCoord().toBigInteger(), '(expected 2*3*G + 2*G = 8*G)');
    
    // Final
    const result = R.add(offset);
    console.log('Final: result x =', result.normalize().getXCoord().toBigInteger(), '(expected G = 1)');
  });
});
