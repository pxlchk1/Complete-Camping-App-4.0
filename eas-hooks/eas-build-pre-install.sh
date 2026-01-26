#!/bin/bash

PLATFORM="$1"
echo "Running pre-install hook for platform: $PLATFORM"

# Remove M1 workaround from Podfile if it exists (iOS only)
if [ "$PLATFORM" = "ios" ] && [ -f "ios/Podfile" ]; then
  echo "Modifying Podfile to remove M1 workaround..."
  sed -i '' '/_apply_Xcode_12_5_M1_post_install_workaround/d' ios/Podfile
  echo "Podfile modified successfully"
fi

# Create the scripts directory if it doesn't exist (for postinstall)
mkdir -p scripts

# Create the patch script inline if it doesn't exist
if [ ! -f "scripts/patch-ios-podspecs.js" ]; then
  echo "Creating patch-ios-podspecs.js..."
  cat > scripts/patch-ios-podspecs.js << 'SCRIPT'
#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function patchPodspec(relPath) {
  const abs = path.join(process.cwd(), relPath);
  if (!fs.existsSync(abs)) {
    return { relPath, status: "missing" };
  }

  const before = fs.readFileSync(abs, "utf8");
  const lines = before.split("\n");

  const afterLines = lines.filter(
    (line) => !/^\s*s\.dependency\s+['"]RCT-Folly['"]/.test(line)
  );
  const after = afterLines.join("\n");

  if (after === before) return { relPath, status: "unchanged" };

  fs.writeFileSync(abs, after, "utf8");
  return { relPath, status: "patched" };
}

function main() {
  const targets = [
    "node_modules/react-native-ios-context-menu/react-native-ios-context-menu.podspec",
    "node_modules/react-native-ios-utilities/react-native-ios-utilities.podspec",
  ];

  const results = targets.map(patchPodspec);

  console.log("[podspec-patch] Removed RCT-Folly dependency lines (if present):");
  for (const r of results) console.log("  - " + r.relPath + ": " + r.status);
}

main();
SCRIPT
  echo "Created patch-ios-podspecs.js"
fi
