# 批量修复JavaScript对象字面量语法

$file = "src\test\java\com\sm\bc\graalvm\PerformanceIntegrationTest.java"

# 读取文件内容
$content = Get-Content $file -Raw

# 替换简单的对象字面量
$content = $content -replace '(\s+)\{\s*(success:', '$1({$2'
$content = $content -replace '(\s+)\}\s*(\r?\n\s*\} catch)', '$1})$2'

# 写回文件
Set-Content -Path $file -Value $content -NoNewline

Write-Host "已修复 PerformanceIntegrationTest.java"