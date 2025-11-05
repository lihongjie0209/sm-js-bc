/**
 * SM3 哈希示例
 * 演示如何使用 SM3Digest 计算数据的哈希值
 */

import { SM3Digest } from 'sm-js-bc';

console.log('=== SM3 哈希示例 ===\n');

// 创建 SM3 摘要实例
const digest = new SM3Digest();

// 更新数据
const data = new TextEncoder().encode('Hello, SM3!');
digest.update(data, 0, data.length);

// 获取哈希值
const hash = new Uint8Array(digest.getDigestSize());
digest.doFinal(hash, 0);

console.log('输入数据:', 'Hello, SM3!');
console.log('SM3 Hash:', Buffer.from(hash).toString('hex'));
console.log('哈希长度:', hash.length, '字节');

// 多次更新示例
console.log('\n--- 分段更新示例 ---');
const digest2 = new SM3Digest();
const part1 = new TextEncoder().encode('Hello, ');
const part2 = new TextEncoder().encode('SM3!');

digest2.update(part1, 0, part1.length);
digest2.update(part2, 0, part2.length);

const hash2 = new Uint8Array(digest2.getDigestSize());
digest2.doFinal(hash2, 0);

console.log('分段输入: "Hello, " + "SM3!"');
console.log('SM3 Hash:', Buffer.from(hash2).toString('hex'));
console.log('结果一致:', Buffer.from(hash).equals(Buffer.from(hash2)));

// 空数据哈希
console.log('\n--- 空数据哈希 ---');
const digest3 = new SM3Digest();
const hash3 = new Uint8Array(digest3.getDigestSize());
digest3.doFinal(hash3, 0);

console.log('空数据 Hash:', Buffer.from(hash3).toString('hex'));

console.log('\n✅ SM3 哈希示例运行完成');
