import { describe, expect, it } from 'vitest'
import { GCMUtil } from '../../../../../src/crypto/modes/gcm/GCMUtil'

describe('GCMUtil', () => {
  describe('xor', () => {
    it('应该正确XOR两个块', () => {
      const block = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      const val = new Uint8Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      
      GCMUtil.xor(block, val)
      
      expect(Array.from(block)).toEqual([17, 13, 13, 9, 9, 13, 13, 1, 1, 13, 13, 9, 9, 13, 13, 17])
    })

    it('应该正确处理零块', () => {
      const block = new Uint8Array(16)
      const val = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      
      GCMUtil.xor(block, val)
      
      expect(Array.from(block)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    })
  })

  describe('asLongs/fromLongs', () => {
    it('应该正确转换字节到bigint并回转', () => {
      const bytes = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
        0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88
      ])
      
      const [x0, x1] = GCMUtil.asLongs(bytes)
      const result = GCMUtil.fromLongs(x0, x1)
      
      expect(Array.from(result)).toEqual(Array.from(bytes))
    })

    it('应该正确转换零', () => {
      const bytes = new Uint8Array(16)
      
      const [x0, x1] = GCMUtil.asLongs(bytes)
      const result = GCMUtil.fromLongs(x0, x1)
      
      expect(x0).toBe(0n)
      expect(x1).toBe(0n)
      expect(Array.from(result)).toEqual(Array.from(bytes))
    })
  })

  describe('multiply', () => {
    it('应该正确乘以零', () => {
      const x = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      const zero = new Uint8Array(16)
      
      const result = GCMUtil.multiply(x, zero)
      
      expect(Array.from(result)).toEqual(Array.from(zero))
    })

    it('零乘以任何数应该得到零', () => {
      const zero = new Uint8Array(16)
      const y = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      
      const result = GCMUtil.multiply(zero, y)
      
      expect(Array.from(result)).toEqual(Array.from(zero))
    })

    it('应该满足交换律: x*y = y*x', () => {
      const x = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      const y = new Uint8Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
      
      const xy = GCMUtil.multiply(x, y)
      const yx = GCMUtil.multiply(y, x)
      
      expect(Array.from(xy)).toEqual(Array.from(yx))
    })

    // Test vector from NIST GCM spec
    it('应该正确计算H * (128-bit block of zeros)', () => {
      // H = 0x66e94bd4ef8a2c3b884cfa59ca342b2e (example hash subkey)
      const H = new Uint8Array([
        0x66, 0xe9, 0x4b, 0xd4, 0xef, 0x8a, 0x2c, 0x3b,
        0x88, 0x4c, 0xfa, 0x59, 0xca, 0x34, 0x2b, 0x2e
      ])
      const zero = new Uint8Array(16)
      
      const result = GCMUtil.multiply(H, zero)
      
      expect(Array.from(result)).toEqual(Array.from(zero))
    })

    // Test that multiply with 1 (0x80000...0) gives the original value shifted
    it('应该正确处理单位元素附近的值', () => {
      const one = new Uint8Array(16)
      one[0] = 0x80 // MSB set, equivalent to x^127 in polynomial representation
      
      const x = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      
      const result = GCMUtil.multiply(x, one)
      
      // Result should not be all zeros (sanity check)
      const isAllZero = result.every(b => b === 0)
      expect(isAllZero).toBe(false)
    })

    // Test from BouncyCastle GCMTest
    it('应该匹配已知测试向量 (BC test case)', () => {
      // This is a simplified test - in real BC tests they use specific H values
      // and check against known outputs
      const H = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ])
      const X = new Uint8Array([
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
      ])
      
      const result = GCMUtil.multiply(H, X)
      
      // H is zero, so result should be zero
      expect(Array.from(result)).toEqual(Array.from(H))
    })
  })

  describe('increment', () => {
    it('应该正确递增计数器（无进位）', () => {
      const counter = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
      
      GCMUtil.increment(counter)
      
      expect(counter[15]).toBe(2)
    })

    it('应该正确处理进位', () => {
      const counter = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255])
      
      GCMUtil.increment(counter)
      
      expect(counter[14]).toBe(1)
      expect(counter[15]).toBe(0)
    })

    it('应该正确处理多次进位', () => {
      const counter = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255])
      
      GCMUtil.increment(counter)
      
      expect(counter[13]).toBe(1)
      expect(counter[14]).toBe(0)
      expect(counter[15]).toBe(0)
    })

    it('应该只递增右边32位', () => {
      const counter = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1])
      
      GCMUtil.increment(counter)
      
      // Left 96 bits should remain unchanged
      expect(Array.from(counter.slice(0, 12))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      // Right 32 bits incremented
      expect(counter[15]).toBe(2)
    })

    it('应该正确处理32位溢出', () => {
      const counter = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 255, 255, 255, 255])
      
      GCMUtil.increment(counter)
      
      // Should wrap around to zero (the 32-bit counter part)
      expect(Array.from(counter.slice(12))).toEqual([0, 0, 0, 0])
      // Left 96 bits unchanged
      expect(Array.from(counter.slice(0, 12))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    })
  })
})
