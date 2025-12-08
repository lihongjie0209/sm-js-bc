import { Mac } from '../Mac';
import { CipherParameters } from '../CipherParameters';
import { KeyParameter } from '../params/KeyParameter';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { ZUCEngine } from '../engines/ZUCEngine';
import { Pack } from '../../util/Pack';

/**
 * ZUC-128 MAC (128-EIA3)
 * 
 * Implementation of the 3GPP Integrity Algorithm 128-EIA3 based on ZUC-128.
 * This MAC produces a 32-bit tag used for integrity protection in LTE/5G.
 * 
 * 标准: 3GPP TS 35.221
 * 参考: org.bouncycastle.crypto.macs.Zuc128Mac
 */
export class Zuc128Mac implements Mac {
  private readonly zuc: ZUCEngine;
  private readonly buf: Uint8Array;
  private bufOff: number;
  private mac: number;
  private wordCount: number;

  /**
   * Create a new ZUC-128 MAC instance.
   */
  constructor() {
    this.zuc = new ZUCEngine();
    this.buf = new Uint8Array(4);
    this.bufOff = 0;
    this.mac = 0;
    this.wordCount = 0;
  }

  /**
   * Initialize the MAC.
   * 
   * @param params - must be ParametersWithIV containing a KeyParameter
   */
  public init(params: CipherParameters): void {
    if (!(params instanceof ParametersWithIV)) {
      throw new Error('Zuc128Mac requires ParametersWithIV');
    }

    this.zuc.init(true, params);
    this.bufOff = 0;
    this.mac = 0;
    this.wordCount = 0;
  }

  /**
   * Return the algorithm name.
   * 
   * @returns "ZUC-128-MAC"
   */
  public getAlgorithmName(): string {
    return 'ZUC-128-MAC';
  }

  /**
   * Return the MAC size (4 bytes = 32 bits).
   * 
   * @returns 4
   */
  public getMacSize(): number {
    return 4;
  }

  /**
   * Add a single byte to the MAC calculation.
   * 
   * @param input - the byte to add
   */
  public update(input: number): void {
    this.buf[this.bufOff++] = input & 0xff;

    if (this.bufOff === 4) {
      this.processWord();
    }
  }

  /**
   * Add multiple bytes to the MAC calculation.
   * 
   * @param input - the byte array containing the data
   * @param inOff - the offset into the input array where the data starts
   * @param len - the length of the data to add
   */
  public updateArray(input: Uint8Array, inOff: number, len: number): void {
    let remaining = len;
    let offset = inOff;

    // Fill buffer first
    if (this.bufOff > 0) {
      while (remaining > 0 && this.bufOff < 4) {
        this.buf[this.bufOff++] = input[offset++];
        remaining--;
      }

      if (this.bufOff === 4) {
        this.processWord();
      }
    }

    // Process complete words
    while (remaining >= 4) {
      this.buf[0] = input[offset++];
      this.buf[1] = input[offset++];
      this.buf[2] = input[offset++];
      this.buf[3] = input[offset++];
      remaining -= 4;
      this.processWord();
    }

    // Store remaining bytes
    while (remaining > 0) {
      this.buf[this.bufOff++] = input[offset++];
      remaining--;
    }
  }

  /**
   * Complete the MAC calculation and write the result to the output array.
   * 
   * @param out - the output array to write the MAC to
   * @param outOff - the offset into the output array to start writing
   * @returns the number of bytes written (4)
   */
  public doFinal(out: Uint8Array, outOff: number): number {
    // Process any remaining bytes
    if (this.bufOff > 0) {
      // Pad with zeros
      while (this.bufOff < 4) {
        this.buf[this.bufOff++] = 0;
      }
      this.processWord();
    }

    // Final MAC value
    Pack.intToBigEndian(this.mac, out, outOff);

    this.reset();

    return 4;
  }

  /**
   * Reset the MAC to its initial state.
   */
  public reset(): void {
    this.zuc.reset();
    this.bufOff = 0;
    this.mac = 0;
    this.wordCount = 0;
    this.buf.fill(0);
  }

  /**
   * Process a complete 32-bit word.
   */
  private processWord(): void {
    const w = Pack.bigEndianToInt(this.buf, 0);

    // Generate keystream word
    const keyStreamWord = this.getKeyStreamWord();

    // XOR with keystream and accumulate
    this.mac ^= (w ^ keyStreamWord);

    this.bufOff = 0;
    this.wordCount++;
  }

  /**
   * Generate a keystream word from ZUC.
   */
  private getKeyStreamWord(): number {
    const temp = new Uint8Array(4);
    const input = new Uint8Array(4);

    this.zuc.processBytes(input, 0, 4, temp, 0);

    return Pack.bigEndianToInt(temp, 0);
  }
}
