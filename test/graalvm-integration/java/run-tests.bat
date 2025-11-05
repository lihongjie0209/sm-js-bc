@echo off
setlocal enabledelayedexpansion

REM SM-BC GraalVM Integration Test Runner for Windows
REM This script ensures proper setup and runs the integration tests

echo === SM-BC GraalVM Integration Test Runner ===
echo.

REM Check if we're in the correct directory
if not exist "pom.xml" (
    echo Error: pom.xml not found. Please run this script from test\graalvm-integration\java\
    exit /b 1
)

REM Check if SM-BC library is built
set SM_BC_LIB=..\..\..\dist\index.cjs
if not exist "%SM_BC_LIB%" (
    echo Error: SM-BC library not found at %SM_BC_LIB%
    echo Please build the library first:
    echo   cd ..\..\..\
    echo   npm install
    echo   npm run build
    exit /b 1
)

echo ✓ SM-BC library found at %SM_BC_LIB%

REM Check Java version
for /f "tokens=3" %%i in ('java -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVA_VERSION_STRING=%%i
)
set JAVA_VERSION_STRING=!JAVA_VERSION_STRING:"=!
for /f "delims=." %%i in ("!JAVA_VERSION_STRING!") do set JAVA_MAJOR=%%i
if !JAVA_MAJOR! LSS 17 (
    echo Warning: Java 17+ recommended ^(found Java !JAVA_MAJOR!^)
) else (
    echo ✓ Java !JAVA_MAJOR! detected
)

REM Check if GraalVM is available (optional)
java -XX:+UnlockExperimentalVMOptions -XX:+EnableJVMCI -version >nul 2>&1
if !errorlevel! equ 0 (
    echo ✓ GraalVM detected
) else (
    echo ℹ Standard JVM detected ^(GraalVM recommended for better performance^)
)

echo.

REM Parse command line arguments
set TEST_CLASS=
set VERBOSE=false
set PERFORMANCE_ONLY=false

:parse_args
if "%~1"=="" goto end_parse_args
if "%~1"=="--class" (
    set TEST_CLASS=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="-c" (
    set TEST_CLASS=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--verbose" (
    set VERBOSE=true
    shift
    goto parse_args
)
if "%~1"=="-v" (
    set VERBOSE=true
    shift
    goto parse_args
)
if "%~1"=="--performance" (
    set PERFORMANCE_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="-p" (
    set PERFORMANCE_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="--help" goto show_help
if "%~1"=="-h" goto show_help
echo Unknown option: %~1
echo Use --help for usage information
exit /b 1

:show_help
echo Usage: %0 [options]
echo.
echo Options:
echo   -c, --class ^<class^>     Run specific test class
echo   -v, --verbose          Enable verbose output
echo   -p, --performance      Run only performance tests
echo   -h, --help            Show this help
echo.
echo Examples:
echo   %0                                    # Run all tests
echo   %0 --class SM2SignatureInteropTest   # Run signature tests
echo   %0 --performance                     # Run performance tests only
echo   %0 --verbose                         # Run with verbose output
exit /b 0

:end_parse_args

REM Build Maven command
set MVN_CMD=mvn clean test

REM Add test class filter if specified
if not "%TEST_CLASS%"=="" (
    set MVN_CMD=!MVN_CMD! -Dtest=%TEST_CLASS%
) else if "%PERFORMANCE_ONLY%"=="true" (
    set MVN_CMD=!MVN_CMD! -Dtest=PerformanceIntegrationTest
)

REM Add verbose logging if requested
if "%VERBOSE%"=="true" (
    set MVN_CMD=!MVN_CMD! -Dorg.slf4j.simpleLogger.defaultLogLevel=DEBUG
)

echo Running: !MVN_CMD!
echo.

REM Run the tests
!MVN_CMD!

if !errorlevel! neq 0 (
    echo.
    echo ❌ Tests failed with exit code !errorlevel!
    echo Please check the output above for error details
    exit /b !errorlevel!
)

echo.
echo === Test Results Summary ===
echo ✓ Integration tests completed successfully
echo.
echo Next steps:
echo   - Check test output above for performance metrics
echo   - Review any warnings or skipped tests
echo   - See README.md for detailed documentation