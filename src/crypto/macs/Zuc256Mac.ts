import { Mac } from '../Mac';
import { CipherParameters } from '../CipherParameters';
import { ParametersWithIV } from '../params/ParametersWithIV';
import { Zuc256Engine } from '../engines/Zuc256Engine';
import { Pack } from '../../util/Pack';

/**
 * ZUC-256 MAC (256-EIA3)
 * 
 * Implementation of the 3GPP Integrity Algorithm 256-EIA3 based on ZUC-256.
 * This MAC can produce 32-bit, 64-bit, or 128-bit tags.
 * 
 * 标准: 3GPP TS 35.222
 * 参考: org.bouncycastle.crypto.macs.Zuc256Mac
 */
export class Zuc256Mac implements Mac {
  private readonly zuc: Zuc256Engine;
  private readonly buf: Uint8Array;
  private bufOff: number;
  private readonly mac: Uint32Array;
  private wordCount: number;
  private readonly macBits: number;

  /**
   * Create a new ZUC-256 MAC instance.
   * 
   * @param macBits - the MAC length in bits (32, 64, or 128)
   */
  constructor(macBits: number = 128) {
    if (macBits !== 32 && macBits !== 64 && macBits !== 128) {
      throw new Error('ZUC-256 MAC length must be 32, 64, or 128 bits');
    }

    this.macBits = macBits;
    this.zuc = new Zuc256Engine();
    this.buf = new Uint8Array(4);
    this.bufOff = 0;
    this.mac = new Uint32Array(4); // Support up to 128-bit MAC
    this.wordCount = 0;
  }

  /**
   * Initialize the MAC.
   * 
   * @param params - must be ParametersWithIV containing a KeyParameter
   */
  public init(params: CipherParameters): void {
    if (!(params instanceof ParametersWithIV)) {
      throw new Error('Zuc256Mac requires ParametersWithIV');
    }

    this.zuc.init(true, params);
    this.bufOff = 0;
    this.mac.fill(0);
    this.wordCount = 0;
  }

  /**
   * Return the algorithm name.
   * 
   * @returns "ZUC-256-MAC"
   */
  public getAlgorithmName(): string {
    return `ZUC-256-MAC-${this.macBits}`;
  }

  /**
   * Return the MAC size in bytes.
   * 
   * @returns the MAC size in bytes
   */
  public getMacSize(): number {
    return this.macBits >>> 3; // Divide by 8
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
   * @returns the number of bytes written
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

    // Write MAC value
    const macBytes = this.getMacSize();
    for (let i = 0; i < macBytes; i += 4) {
      const wordIndex = i >>> 2;
      Pack.intToBigEndian(this.mac[wordIndex], out, outOff + i);
    }

    this.reset();

    return macBytes;
  }

  /**
   * Reset the MAC to its initial state.
   */
  public reset(): void {
    this.zuc.reset();
    this.bufOff = 0;
    this.mac.fill(0);
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
    const macIndex = Math.min(Math.floor(this.wordCount / 32), 3);
    this.mac[macIndex] ^= (w ^ keyStreamWord);

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
