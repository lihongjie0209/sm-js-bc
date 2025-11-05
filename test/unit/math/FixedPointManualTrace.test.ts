import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import { FixedPointUtil } from '../../../src/math/ec/FixedPointUtil';
import { Nat } from '../../../src/math/raw/Nat';
// Import ECPoint to trigger factory registration
import '../../../src/math/ec/ECPoint';

describe('FixedPointCombMultiplier Manual Trace', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should manually trace k=1 multiplication step by step', () => {
    console.log('\n=== Manual Trace of FixedPointCombMultiplier for k=1 ===\n');
    
    const k = 1n;
    
    // Step 1: Get parameters
    const size = FixedPointUtil.getCombSize(curve);
    console.log('1. size =', size);
    
    const info = FixedPointUtil.precompute(G);
    const lookupTable = info.getLookupTable()!;
    const width = info.getWidth();
    const offset = info.getOffset()!;
    
    console.log('2. width =', width);
    console.log('3. offset x =', offset.normalize().getXCoord().toBigInteger());
    
    const d = Math.floor((size + width - 1) / width);
    console.log('4. d =', d);
    
    // Step 2: Initialize R
    let R = curve.getInfinity();
    console.log('5. R initialized to infinity');
    
    // Step 3: Convert k to bit array
    const fullComb = d * width;
    console.log('6. fullComb = d * width =', fullComb);
    
    const K = Nat.fromBigInteger(fullComb, k);
    console.log('7. K (bit array for k=1):');
    for (let i = 0; i < K.length; i++) {
      if (K[i] !== 0) {
        console.log(`   K[${i}] = ${K[i].toString(2).padStart(32, '0')}`);
      }
    }
    
    // Step 4: Comb iteration
    const top = fullComb - 1;
    console.log('8. top =', top);
    console.log('\n9. Comb iterations:');
    
    for (let i = 0; i < d; i++) {
      console.log(`\n   Iteration i=${i}:`);
      
      let secretIndex = 0;
      console.log(`   Starting secretIndex = 0`);
      
      // Inner loop to compute secretIndex
      const jValues = [];
      for (let j = top - i; j >= 0; j -= d) {
        jValues.push(j);
        const wordIndex = j >>> 5;
        const bitOffset = j & 0x1F;
        const secretBit = K[wordIndex] >>> bitOffset;
        
        const oldIndex = secretIndex;
        secretIndex ^= secretBit >>> 1;
        secretIndex <<= 1;
        secretIndex ^= secretBit;
        
        if (j <= 2 || secretBit !== 0) {
          console.log(`     j=${j}: K[${wordIndex}]>>>${bitOffset} = ${secretBit & 1}, secretIndex: ${oldIndex} -> ${secretIndex}`);
        }
      }
      
      console.log(`   j values: ${jValues.join(', ')}`);
      console.log(`   Final secretIndex = ${secretIndex}`);
      
      // Lookup point
      const add = lookupTable.lookup(secretIndex);
      console.log(`   lookup(${secretIndex}) x =`, add.normalize().getXCoord().toBigInteger());
      
      // Update R
      const oldR = R;
      R = R.twicePlus(add);
      console.log(`   R = R.twicePlus(add)`);
      console.log(`   R.isInfinity() =`, R.isInfinity());
      if (!R.isInfinity()) {
        console.log(`   R x =`, R.normalize().getXCoord().toBigInteger());
        console.log(`   R y =`, R.normalize().getYCoord().toBigInteger());
      }
    }
    
    console.log('\n10. After all iterations:');
    console.log('   R.isInfinity() =', R.isInfinity());
    if (!R.isInfinity()) {
      console.log('   R x =', R.normalize().getXCoord().toBigInteger());
      console.log('   R y =', R.normalize().getYCoord().toBigInteger());
    }
    
    // Step 5: Add offset
    console.log('\n11. Adding offset:');
    console.log('   offset x =', offset.normalize().getXCoord().toBigInteger());
    console.log('   offset y =', offset.normalize().getYCoord().toBigInteger());
    
    const result = R.add(offset);
    console.log('\n12. Final result:');
    console.log('   result.isInfinity() =', result.isInfinity());
    if (!result.isInfinity()) {
      console.log('   result x =', result.normalize().getXCoord().toBigInteger());
      console.log('   result y =', result.normalize().getYCoord().toBigInteger());
    }
    
    console.log('\n13. Expected (G):');
    console.log('   G x =', G.normalize().getXCoord().toBigInteger());
    console.log('   G y =', G.normalize().getYCoord().toBigInteger());
    
    // Verify result
    if (!result.isInfinity()) {
      const resultNorm = result.normalize();
      const GNorm = G.normalize();
      expect(resultNorm.getXCoord().toBigInteger()).toBe(GNorm.getXCoord().toBigInteger());
      expect(resultNorm.getYCoord().toBigInteger()).toBe(GNorm.getYCoord().toBigInteger());
    } else {
      // If result is infinity, this is the bug!
      console.log('\n❌ BUG: Result is infinity when it should be G!');
      expect(result.isInfinity()).toBe(false);
    }
  });
});
