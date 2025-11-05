#!/bin/bash

# SM-BC GraalVM Integration Test Runner
# This script ensures proper setup and runs the integration tests

set -e  # Exit on any error

echo "=== SM-BC GraalVM Integration Test Runner ==="
echo

# Check if we're in the correct directory
if [ ! -f "pom.xml" ]; then
    echo "Error: pom.xml not found. Please run this script from test/graalvm-integration/java/"
    exit 1
fi

# Check if SM-BC library is built
SM_BC_LIB="../../../dist/index.cjs"
if [ ! -f "$SM_BC_LIB" ]; then
    echo "Error: SM-BC library not found at $SM_BC_LIB"
    echo "Please build the library first:"
    echo "  cd ../../../"
    echo "  npm install"
    echo "  npm run build"
    exit 1
fi

echo "✓ SM-BC library found at $SM_BC_LIB"

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | grep -oP 'version "?\K[0-9]+')
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "Warning: Java 17+ recommended (found Java $JAVA_VERSION)"
fi

# Check if GraalVM JavaScript is available (optional)
if java -XX:+UnlockExperimentalVMOptions -XX:+EnableJVMCI -version &> /dev/null; then
    echo "✓ GraalVM detected"
else
    echo "ℹ Standard JVM detected (GraalVM recommended for better performance)"
fi

echo

# Parse command line arguments
TEST_CLASS=""
VERBOSE=false
PERFORMANCE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --class|-c)
            TEST_CLASS="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --performance|-p)
            PERFORMANCE_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo
            echo "Options:"
            echo "  -c, --class <class>     Run specific test class"
            echo "  -v, --verbose          Enable verbose output"
            echo "  -p, --performance      Run only performance tests"
            echo "  -h, --help            Show this help"
            echo
            echo "Examples:"
            echo "  $0                                    # Run all tests"
            echo "  $0 --class SM2SignatureInteropTest   # Run signature tests"
            echo "  $0 --performance                     # Run performance tests only"
            echo "  $0 --verbose                         # Run with verbose output"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build Maven command
MVN_CMD="mvn clean test"

# Add test class filter if specified
if [ -n "$TEST_CLASS" ]; then
    MVN_CMD="$MVN_CMD -Dtest=$TEST_CLASS"
elif [ "$PERFORMANCE_ONLY" = true ]; then
    MVN_CMD="$MVN_CMD -Dtest=PerformanceIntegrationTest"
fi

# Add verbose logging if requested
if [ "$VERBOSE" = true ]; then
    MVN_CMD="$MVN_CMD -Dorg.slf4j.simpleLogger.defaultLogLevel=DEBUG"
fi

echo "Running: $MVN_CMD"
echo

# Run the tests
$MVN_CMD

echo
echo "=== Test Results Summary ==="
echo "✓ Integration tests completed successfully"
echo
echo "Next steps:"
echo "  - Check test output above for performance metrics"
echo "  - Review any warnings or skipped tests"
echo "  - See README.md for detailed documentation"