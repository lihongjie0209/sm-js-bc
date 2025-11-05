import { describe, it, expect } from 'vitest';
import { ECCurveFp } from '../../../src/math/ec/ECCurve';
import '../../../src/math/ec/ECPoint';

describe('Verify 8*G calculation', () => {
  const p = 1063n;
  const a = 4n;
  const b = 20n;
  const curve = new ECCurveFp(p, a, b);
  const G = curve.validatePoint(1n, 5n);

  it('should compute 8*G correctly', () => {
    const twoG = G.twice();
    const fourG = twoG.twice();
    const eightG = fourG.twice();
    
    console.log('\nG x =', G.normalize().getXCoord().toBigInteger());
    console.log('2*G x =', twoG.normalize().getXCoord().toBigInteger());
    console.log('3*G x =', G.add(twoG).normalize().getXCoord().toBigInteger());
    console.log('4*G x =', fourG.normalize().getXCoord().toBigInteger());
    console.log('8*G x =', eightG.normalize().getXCoord().toBigInteger());
    
    // Also test 2*3*G + 2*G = 6*G + 2*G = 8*G
    const threeG = G.add(twoG);
    const sixG = threeG.twice();
    const sixGplusTwoG = sixG.add(twoG);
    
    console.log('\n3*G x =', threeG.normalize().getXCoord().toBigInteger());
    console.log('6*G x =', sixG.normalize().getXCoord().toBigInteger());
    console.log('6*G + 2*G x =', sixGplusTwoG.normalize().getXCoord().toBigInteger());
    
    expect(sixGplusTwoG.normalize().getXCoord().toBigInteger()).toBe(
      eightG.normalize().getXCoord().toBigInteger()
    );
    
    // Also test twicePlus
    const threeG_twicePlus_twoG = threeG.twicePlus(twoG);
    console.log('\n3*G.twicePlus(2*G) x =', threeG_twicePlus_twoG.normalize().getXCoord().toBigInteger());
    
    expect(threeG_twicePlus_twoG.normalize().getXCoord().toBigInteger()).toBe(
      eightG.normalize().getXCoord().toBigInteger()
    );
  });
});
