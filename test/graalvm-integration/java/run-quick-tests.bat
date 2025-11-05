@echo off
REM SM-BC Java Integration Tests - Quick Run Script
REM Usage: run-quick-tests.bat

echo ========================================
echo SM-BC Java Integration Tests
echo Quick Test Profile
echo ========================================
echo.

REM Check if we're in the correct directory
if not exist pom.xml (
    echo Error: pom.xml not found. Please run this script from the java directory.
    echo cd test\graalvm-integration\java
    exit /b 1
)

REM Check if Maven is installed
where mvn >nul 2>&1
if errorlevel 1 (
    echo Error: Maven not found. Please install Maven first.
    exit /b 1
)

REM Check if Java is installed
where java >nul 2>&1
if errorlevel 1 (
    echo Error: Java not found. Please install Java 17+ first.
    exit /b 1
)

echo √ Prerequisites check passed
echo.

REM Check if SM-BC library is built
if not exist "..\..\..\dist\index.cjs" (
    echo Warning: SM-BC library not built. Building now...
    echo.
    cd ..\..\..
    call npm install
    call npm run build
    cd test\graalvm-integration\java
    echo.
    echo √ SM-BC library built successfully
    echo.
)

REM Run quick tests
echo Running quick tests (10 iterations, ~10 seconds)...
echo.
call mvn test -P quick

REM Check exit code
if errorlevel 1 (
    echo.
    echo ========================================
    echo X Tests failed!
    echo ========================================
    exit /b 1
) else (
    echo.
    echo ========================================
    echo √ Quick tests passed!
    echo ========================================
    echo.
    echo To run more comprehensive tests:
    echo   Standard (1 min):    mvn test
    echo   Full (5 min):        mvn test -P full
    echo   Benchmark:           mvn test -P benchmark
    echo.
)
