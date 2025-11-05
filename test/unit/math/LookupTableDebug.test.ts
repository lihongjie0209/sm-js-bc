import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('Verify Expected Values', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should compute what R should be after 3 iterations of comb', () => {
    // According to the trace:
    // Iteration 0: R = infinity.twicePlus(G) = 0*2 + G = G
    // Iteration 1: R = G.twicePlus(G) = G*2 + G = 3G
    // Iteration 2: R = 3G.twicePlus(lookup(1)) = 3G*2 + lookup(1) = 6G + lookup(1)
    
    // But what is lookup(1)?
    // From FixedPointUtil test: lookupTable[1] x = 817
    
    const twoG = G.twice();
    const threeG = twoG.add(G);
    
    console.log('\n2*G:', twoG.normalize().getXCoord().toBigInteger(), twoG.normalize().getYCoord().toBigInteger());
    console.log('3*G:', threeG.normalize().getXCoord().toBigInteger(), threeG.normalize().getYCoord().toBigInteger());
    
    const sixG = threeG.twice();
    console.log('6*G:', sixG.normalize().getXCoord().toBigInteger(), sixG.normalize().getYCoord().toBigInteger());
    
    // Now what is lookup(1)?
    // According to Java code, the lookup table is built with a specific pattern
    // Let me manually trace the lookup table construction
    
    // pow2Table[0] = G
    // pow2Table[1] = G * 2^d = G * 2^3 = 8G
    // pow2Table[2] = G * 2^6 = 64G
    // ...
    
    const eightG = G.timesPow2(3);
    console.log('8*G (pow2[1]):', eightG.normalize().getXCoord().toBigInteger());
    
    // lookupTable construction in Java:
    // lookupTable[0] = pow2Table[0] = G
    // Then for each bit from minWidth-1 down to 0:
    //   bit 4: step=16, fills indices 16,17,...,31 (but table size is 32)
    //   bit 3: step=8, fills indices 8,9,...,15, 24,25,...,31
    //   bit 2: step=4, fills indices 4,5,...,7, 12,13,...,15, etc.
    //   bit 1: step=2, fills indices 2,3, 6,7, 10,11, 14,15, etc.
    //   bit 0: step=1, fills indices 1, 3, 5, 7, 9, 11, etc.
    
    // For lookupTable[1] (binary 00001):
    // This means only bit 0 is set
    // So lookupTable[1] = lookupTable[0] + pow2Table[0] = G + G = 2G
    
    // Wait, that doesn't match! Let me re-read the Java code...
  });

  it('should manually build lookup table to understand index semantics', () => {
    const d = 3;
    const minWidth = 5;
    const n = 1 << minWidth; // 32
    
    console.log('\n=== Manual Lookup Table Construction ===');
    
    // Step 1: Build pow2Table
    const pow2Table = [];
    pow2Table[0] = G;
    for (let i = 1; i < minWidth; i++) {
      pow2Table[i] = pow2Table[i - 1].timesPow2(d);
    }
    
    console.log('pow2Table:');
    for (let i = 0; i < minWidth; i++) {
      console.log(`  pow2[${i}] x =`, pow2Table[i].normalize().getXCoord().toBigInteger());
    }
    
    // Step 2: Build lookupTable
    const lookupTable = new Array(n);
    lookupTable[0] = pow2Table[0];
    
    // Java code:
    // for (int bit = minWidth - 1; bit >= 0; --bit)
    // {
    //     ECPoint pow2 = pow2Table[bit];
    //     int step = 1 << bit;
    //     for (int i = step; i < n; i += (step << 1))
    //     {
    //         lookupTable[i] = lookupTable[i - step].add(pow2);
    //     }
    // }
    
    for (let bit = minWidth - 1; bit >= 0; bit--) {
      const pow2 = pow2Table[bit];
      const step = 1 << bit;
      console.log(`\nBit ${bit}, step = ${step}, pow2 x =`, pow2.normalize().getXCoord().toBigInteger());
      
      for (let i = step; i < n; i += (step << 1)) {
        if (!lookupTable[i - step]) {
          console.log(`  Warning: lookupTable[${i - step}] is undefined!`);
          continue;
        }
        lookupTable[i] = lookupTable[i - step].add(pow2);
        
        if (i <= 5) {
          console.log(`  lookupTable[${i}] = lookupTable[${i - step}] + pow2[${bit}] = x:`, 
            lookupTable[i].normalize().getXCoord().toBigInteger());
        }
      }
    }
    
    console.log('\nFinal lookup table (first 8 entries):');
    for (let i = 0; i < 8; i++) {
      if (lookupTable[i]) {
        console.log(`  lookupTable[${i}] x =`, lookupTable[i].normalize().getXCoord().toBigInteger());
      } else {
        console.log(`  lookupTable[${i}] = undefined`);
      }
    }
  });
});
