#!/bin/bash

# SM-BC Java Integration Tests - Quick Run Script
# Usage: ./run-quick-tests.sh

echo "========================================"
echo "SM-BC Java Integration Tests"
echo "Quick Test Profile"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "pom.xml" ]; then
    echo "Error: pom.xml not found. Please run this script from the java directory."
    echo "cd test/graalvm-integration/java"
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Error: Maven not found. Please install Maven first."
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Error: Java not found. Please install Java 17+ first."
    exit 1
fi

# Check Java version
java_version=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$java_version" -lt 17 ]; then
    echo "Error: Java 17+ required. Current version: $java_version"
    exit 1
fi

echo "✓ Prerequisites check passed"
echo ""

# Check if SM-BC library is built
if [ ! -f "../../../dist/index.cjs" ]; then
    echo "Warning: SM-BC library not built. Building now..."
    echo ""
    cd ../../..
    npm install
    npm run build
    cd test/graalvm-integration/java
    echo ""
    echo "✓ SM-BC library built successfully"
    echo ""
fi

# Run quick tests
echo "Running quick tests (10 iterations, ~10 seconds)..."
echo ""
mvn test -P quick

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ Quick tests passed!"
    echo "========================================"
    echo ""
    echo "To run more comprehensive tests:"
    echo "  Standard (1 min):    mvn test"
    echo "  Full (5 min):        mvn test -P full"
    echo "  Benchmark:           mvn test -P benchmark"
    echo ""
else
    echo ""
    echo "========================================"
    echo "❌ Tests failed!"
    echo "========================================"
    exit 1
fi
