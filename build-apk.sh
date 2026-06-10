#!/usr/bin/env bash
# ============================================================
# HOLLOW — Gradle-free Android APK builder
#
# Wraps the HTML5 game (www/) in a minimal native WebView activity
# (android-native/) and builds a signed debug APK using only the raw
# Android toolchain: aapt2 -> javac -> d8 -> zipalign -> apksigner.
#
# Why not Gradle/Cordova? AGP's in-process JVM resource compiler
# (aaptcompiler) can fail on AppCompat resources in some sandboxed
# build environments. This path avoids AppCompat and AGP entirely,
# producing a tiny (~34 KB) self-contained APK.
#
# Requirements:
#   - A JDK (17 or 21) on PATH, or JAVA_HOME set
#   - Android SDK with build-tools + a platform, via ANDROID_SDK_ROOT
#     (or ANDROID_HOME). Install with sdkmanager:
#       sdkmanager "platform-tools" "platforms;android-34" "build-tools;35.0.0"
#
# Usage:
#   ./build-apk.sh                # outputs build/HOLLOW-debug.apk
#   BUILD_TOOLS=35.0.0 PLATFORM=android-34 ./build-apk.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
[ -n "$SDK" ] || { echo "ERROR: set ANDROID_SDK_ROOT (or ANDROID_HOME)"; exit 1; }

BUILD_TOOLS="${BUILD_TOOLS:-$(ls "$SDK/build-tools" | sort -V | tail -1)}"
PLATFORM="${PLATFORM:-$(ls "$SDK/platforms" | sort -V | tail -1)}"
BT="$SDK/build-tools/$BUILD_TOOLS"
AJAR="$SDK/platforms/$PLATFORM/android.jar"
[ -x "$BT/aapt2" ] || { echo "ERROR: aapt2 not found in $BT"; exit 1; }
[ -f "$AJAR" ]     || { echo "ERROR: android.jar not found at $AJAR"; exit 1; }

echo "SDK=$SDK"
echo "build-tools=$BUILD_TOOLS  platform=$PLATFORM"

SRC="$ROOT/android-native"
BUILD="$ROOT/build"
WORK="$BUILD/work"
rm -rf "$BUILD"; mkdir -p "$WORK/gen" "$WORK/classes" "$WORK/res" "$WORK/assets"

# Stage assets (the game) + generate launcher icons
cp -r "$ROOT/www" "$WORK/assets/www"
echo "1) generate launcher icons"
( cd "$WORK" && javac "$SRC/tools/IconGen.java" -d . && java -cp . IconGen "$WORK/res" )

echo "2) aapt2 compile resources"
"$BT/aapt2" compile --dir "$WORK/res" -o "$WORK/res.zip"

echo "3) aapt2 link"
"$BT/aapt2" link -o "$WORK/base.apk" \
  -I "$AJAR" \
  --manifest "$SRC/AndroidManifest.xml" \
  -A "$WORK/assets" \
  --java "$WORK/gen" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0 \
  "$WORK/res.zip"

echo "4) javac"
javac -source 8 -target 8 -nowarn -d "$WORK/classes" -classpath "$AJAR" \
  $(find "$SRC/src" "$WORK/gen" -name "*.java")

echo "5) d8 -> classes.dex"
"$BT/d8" --min-api 24 --lib "$AJAR" --output "$WORK" $(find "$WORK/classes" -name "*.class")

echo "6) package dex into apk"
cp "$WORK/base.apk" "$WORK/unsigned.apk"
( cd "$WORK" && zip -j -X unsigned.apk classes.dex >/dev/null )

echo "7) zipalign"
"$BT/zipalign" -f -p 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "8) debug keystore"
KS="$BUILD/debug.keystore"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" \
    -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=HOLLOW Debug,O=HOLLOW,C=US" >/dev/null 2>&1
fi

echo "9) sign"
"$BT/apksigner" sign \
  --ks "$KS" --ks-pass pass:android --key-pass pass:android \
  --out "$BUILD/HOLLOW-debug.apk" "$WORK/aligned.apk"

"$BT/apksigner" verify "$BUILD/HOLLOW-debug.apk" && \
  echo "" && echo "BUILT: $BUILD/HOLLOW-debug.apk"
ls -la "$BUILD/HOLLOW-debug.apk"
