#!/usr/bin/env node

/**
 * 一键测试脚本 - 执行JavaScript和Java测试
 * 检测环境依赖（Java、Maven、Node.js）并运行所有测试
 * 
 * 使用方法:
 *   node test-all.mjs
 *   node test-all.mjs --skip-java
 *   node test-all.mjs --skip-js
 *   node test-all.mjs --verbose
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 命令行参数解析
const args = process.argv.slice(2);
const options = {
  skipJava: args.includes('--skip-java'),
  skipJavaScript: args.includes('--skip-js'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function colorOutput(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { colorOutput(`✅ ${message}`, 'green'); }
function error(message) { colorOutput(`❌ ${message}`, 'red'); }
function warning(message) { colorOutput(`⚠️  ${message}`, 'yellow'); }
function info(message) { colorOutput(`ℹ️  ${message}`, 'cyan'); }

// 帮助信息
function showHelp() {
  console.log(`
🧪 一键测试脚本

用法:
  node test-all.mjs [选项]

选项:
  --skip-java     跳过Java测试
  --skip-js       跳过JavaScript测试
  --verbose       显示详细输出
  --help, -h      显示帮助信息

示例:
  node test-all.mjs                 # 运行所有测试
  node test-all.mjs --skip-java     # 只运行JavaScript测试
  node test-all.mjs --skip-js       # 只运行Java测试
  node test-all.mjs --verbose       # 详细输出模式
`);
}

// 检测命令是否存在
async function commandExists(command) {
  try {
    await execAsync(`where ${command}`, { timeout: 5000 });
    return true;
  } catch {
    try {
      await execAsync(`which ${command}`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// 获取版本信息
async function getVersion(command, versionFlag = '--version') {
  try {
    const { stdout, stderr } = await execAsync(`${command} ${versionFlag}`, { timeout: 10000 });
    return (stdout || stderr).trim();
  } catch {
    return null;
  }
}

async function getJavaVersion() {
  try {
    const { stderr } = await execAsync('java -version', { timeout: 10000 });
    const match = stderr.match(/version "([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// 检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 运行命令并返回结果
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn(command, args, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    if (!options.verbose) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      const duration = (Date.now() - startTime) / 1000;
      resolve({
        code,
        stdout,
        stderr,
        duration,
        success: code === 0
      });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// 主要检测逻辑
async function detectEnvironment() {
  colorOutput('🚀 开始环境检测和测试...', 'magenta');
  colorOutput('='.repeat(50), 'gray');

  const results = {
    errors: [],
    warnings: [],
    node: null,
    npm: null,
    java: null,
    maven: null,
    gradle: null
  };

  // 检测Node.js和npm
  info('检测JavaScript环境...');
  
  if (await commandExists('node')) {
    const nodeVersion = await getVersion('node', '--version');
    results.node = nodeVersion;
    success(`Node.js 已安装: ${nodeVersion}`);
    
    if (await commandExists('npm')) {
      const npmVersion = await getVersion('npm', '--version');
      results.npm = npmVersion;
      success(`npm 已安装: ${npmVersion}`);
    } else {
      results.errors.push('npm 未安装');
      error('npm 未安装');
    }
  } else {
    results.errors.push('Node.js 未安装');
    error('Node.js 未安装');
  }

  // 检测项目文件
  if (await fileExists('package.json')) {
    success('package.json 存在');
    if (await fileExists('node_modules')) {
      success('node_modules 存在');
    } else {
      results.warnings.push('node_modules 不存在，将尝试安装依赖');
      warning('node_modules 不存在，将尝试安装依赖');
    }
  } else {
    results.errors.push('package.json 不存在');
    error('package.json 不存在');
  }

  // 检测Java环境
  if (!options.skipJava) {
    info('检测Java环境...');
    
    if (await commandExists('java')) {
      const javaVersion = await getJavaVersion();
      results.java = javaVersion;
      success(`Java 已安装: ${javaVersion}`);
      
      // 检查Java版本
      const majorVersion = javaVersion?.match(/^(\d+)/) || javaVersion?.match(/^1\.(\d+)/);
      if (majorVersion && parseInt(majorVersion[1]) >= 8) {
        success('Java版本符合要求 (8+)');
      } else {
        results.warnings.push('Java版本可能过低，建议使用Java 8或更高版本');
        warning('Java版本可能过低，建议使用Java 8或更高版本');
      }
    } else {
      results.warnings.push('Java 未安装，将跳过Java测试');
      warning('Java 未安装，将跳过Java测试');
      options.skipJava = true;
    }

    // 检测构建工具 (优先Maven)
    if (!options.skipJava) {
      if (await commandExists('mvn')) {
        const mavenVersion = await getVersion('mvn', '--version');
        results.maven = mavenVersion?.split('\n')[0];
        success(`Maven 已安装: ${results.maven}`);
      } else {
        results.warnings.push('Maven 未安装，将跳过Java测试');
        warning('Maven 未安装，将跳过Java测试');
        options.skipJava = true;
      }

      // 检测Gradle作为备用（但不推荐）
      if (await commandExists('gradle') || await fileExists('data/bc-java/gradlew') || await fileExists('data/bc-java/gradlew.bat')) {
        if (await commandExists('gradle')) {
          const gradleVersion = await getVersion('gradle', '--version');
          results.gradle = gradleVersion?.split('\n')[0];
          if (!results.maven) {
            warning(`Gradle 已安装但推荐使用Maven: ${results.gradle}`);
          }
        } else if (!results.maven) {
          warning('Gradle Wrapper 存在但推荐使用Maven');
          results.gradle = 'Gradle Wrapper';
        }
      }

      // 检测Java项目
      if (await fileExists('test/graalvm-integration/java')) {
        success('Java测试项目目录存在: test/graalvm-integration/java');
        
        if (await fileExists('test/graalvm-integration/java/pom.xml')) {
          success('Maven构建文件存在: pom.xml');
        } else {
          results.warnings.push('Java测试项目构建文件未找到');
          warning('Java测试项目构建文件未找到');
        }
      } else {
        results.warnings.push('Java测试项目目录不存在: test/graalvm-integration/java');
        warning('Java测试项目目录不存在: test/graalvm-integration/java，将跳过Java测试');
        options.skipJava = true;
      }
    }
  }

  return results;
}

// 执行JavaScript测试
async function runJavaScriptTests() {
  if (options.skipJavaScript) {
    warning('跳过JavaScript测试');
    return null;
  }

  info('执行JavaScript测试...');

  // 检查并安装依赖
  if (!(await fileExists('node_modules'))) {
    info('安装npm依赖...');
    try {
      const installResult = await runCommand('npm', ['install'], { verbose: options.verbose });
      if (installResult.success) {
        success('npm依赖安装成功');
      } else {
        error('npm依赖安装失败');
        if (!options.verbose) {
          console.log(installResult.stderr);
        }
        return false;
      }
    } catch (err) {
      error(`npm依赖安装失败: ${err.message}`);
      return false;
    }
  }

  try {
    info('运行JavaScript测试...');
    const testResult = await runCommand('npm', ['test'], { verbose: options.verbose });
    
    if (testResult.success) {
      success(`JavaScript测试通过 (用时: ${testResult.duration.toFixed(2)}s)`);
      return true;
    } else {
      error('JavaScript测试失败');
      if (!options.verbose) {
        console.log(testResult.stdout);
        console.log(testResult.stderr);
      }
      return false;
    }
  } catch (err) {
    error(`JavaScript测试执行失败: ${err.message}`);
    return false;
  }
}

// 解析Maven测试输出获取测试数量
function parseMavenTestResults(output) {
  const testSummaryMatch = output.match(/Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/);
  if (testSummaryMatch) {
    return {
      total: parseInt(testSummaryMatch[1]),
      failures: parseInt(testSummaryMatch[2]),
      errors: parseInt(testSummaryMatch[3]),
      skipped: parseInt(testSummaryMatch[4]),
      passed: parseInt(testSummaryMatch[1]) - parseInt(testSummaryMatch[2]) - parseInt(testSummaryMatch[3])
    };
  }
  return null;
}

// 执行Java测试
async function runJavaTests() {
  if (options.skipJava) {
    warning('跳过Java测试');
    return null;
  }

  info('执行Java GraalVM集成测试...');
  colorOutput('  包含: SM3摘要、SM2签名、SM2加密跨语言互操作测试', 'gray');

  const javaProjectPath = path.join(__dirname, 'test', 'graalvm-integration', 'java');
  const originalDir = process.cwd();

  try {
    process.chdir(javaProjectPath);
    info(`切换到Java项目目录: ${javaProjectPath}`);

    let testCommand;
    let testArgs;

    // 使用Maven执行GraalVM集成测试
    if (await fileExists('pom.xml')) {
      info('使用Maven执行测试套件...');
      testCommand = 'mvn';
      testArgs = ['clean', 'test'];
      
      if (!options.verbose) {
        info('测试类别:');
        colorOutput('  • SM3参数化测试 (77个测试)', 'gray');
        colorOutput('  • SM3属性测试 (720个测试 = 72属性 × 10迭代)', 'gray');
        colorOutput('  • SM3互操作测试 (5个测试)', 'gray');
        colorOutput('  • SM2签名参数化测试 (25个测试)', 'gray');
        colorOutput('  • SM2签名属性测试 (100个测试 = 10属性 × 10迭代)', 'gray');
        colorOutput('  • SM2签名互操作测试 (4个测试)', 'gray');
        colorOutput('  • SM2加密参数化测试 (39个测试)', 'gray');
        colorOutput('  • SM2加密属性测试 (100个测试 = 10属性 × 10迭代)', 'gray');
        colorOutput('  • SM2加密互操作测试 (4个测试)', 'gray');
        colorOutput('  • 简化跨语言测试 (3个测试)', 'gray');
        colorOutput('  预计总数: 1077个测试', 'cyan');
      }
    } else {
      warning('未找到pom.xml文件，跳过Java测试');
      return null;
    }

    const testResult = await runCommand(testCommand, testArgs, { 
      verbose: options.verbose,
      cwd: javaProjectPath
    });

    if (testResult.success) {
      // 解析测试结果
      const testStats = parseMavenTestResults(testResult.stdout);
      
      if (testStats && !options.verbose) {
        success(`Java测试通过 (用时: ${testResult.duration.toFixed(2)}s)`);
        info(`测试统计:`);
        colorOutput(`  总计: ${testStats.total} 个测试`, 'cyan');
        colorOutput(`  通过: ${testStats.passed} 个`, 'green');
        if (testStats.failures > 0) {
          colorOutput(`  失败: ${testStats.failures} 个`, 'red');
        }
        if (testStats.errors > 0) {
          colorOutput(`  错误: ${testStats.errors} 个`, 'red');
        }
        if (testStats.skipped > 0) {
          colorOutput(`  跳过: ${testStats.skipped} 个`, 'yellow');
        }
      } else {
        success(`Java测试通过 (用时: ${testResult.duration.toFixed(2)}s)`);
      }
      
      return true;
    } else {
      error('Java测试失败');
      if (!options.verbose) {
        console.log(testResult.stdout);
        console.log(testResult.stderr);
      }
      return false;
    }
  } catch (err) {
    error(`Java测试执行失败: ${err.message}`);
    return false;
  } finally {
    process.chdir(originalDir);
  }
}

// 主函数
async function main() {
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    // 环境检测
    const envResults = await detectEnvironment();

    // 输出检测结果
    colorOutput('='.repeat(50), 'gray');
    
    if (envResults.errors.length > 0) {
      error('发现严重问题:');
      envResults.errors.forEach(err => {
        colorOutput(`  • ${err}`, 'red');
      });
    }

    if (envResults.warnings.length > 0) {
      warning('发现警告:');
      envResults.warnings.forEach(warn => {
        colorOutput(`  • ${warn}`, 'yellow');
      });
    }

    if (envResults.errors.length > 0) {
      error('由于存在严重问题，无法继续执行测试');
      info('请安装缺失的依赖后重试:');
      colorOutput('  • Node.js: https://nodejs.org/', 'white');
      colorOutput('  • Java: https://adoptium.net/', 'white');
      colorOutput('  • Maven: https://maven.apache.org/', 'white');
      process.exit(1);
    }

    // 开始执行测试
    colorOutput('🧪 开始执行测试...', 'magenta');
    colorOutput('='.repeat(50), 'gray');

    const testResults = {
      javascript: await runJavaScriptTests(),
      java: await runJavaTests()
    };

    // 输出最终结果
    colorOutput('='.repeat(50), 'gray');
    colorOutput('📊 测试结果汇总', 'magenta');
    colorOutput('='.repeat(50), 'gray');

    let overallSuccess = true;

    if (testResults.javascript !== null) {
      if (testResults.javascript) {
        success('JavaScript测试: 通过');
      } else {
        error('JavaScript测试: 失败');
        overallSuccess = false;
      }
    }

    if (testResults.java !== null) {
      if (testResults.java) {
        success('Java测试: 通过');
      } else {
        error('Java测试: 失败');
        overallSuccess = false;
      }
    }

    colorOutput('='.repeat(50), 'gray');
    if (overallSuccess) {
      success('🎉 所有测试均已通过！');
      process.exit(0);
    } else {
      error('💥 部分测试失败，请检查上述错误信息');
      process.exit(1);
    }

  } catch (err) {
    error(`脚本执行失败: ${err.message}`);
    if (options.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// 运行主函数
main().catch(err => {
  console.error('未捕获的错误:', err);
  process.exit(1);
});