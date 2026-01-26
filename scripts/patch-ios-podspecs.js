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

  // Remove any explicit RCT-Folly dependency lines:
  //   s.dependency 'RCT-Folly', folly_version
  //   s.dependency "RCT-Folly", "2022.05.16.00"
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
  for (const r of results) console.log(`  - ${r.relPath}: ${r.status}`);

  // Fail fast if context-menu still references RCT-Folly
  const ctx = path.join(
    process.cwd(),
    "node_modules/react-native-ios-context-menu/react-native-ios-context-menu.podspec"
  );
  if (fs.existsSync(ctx)) {
    const txt = fs.readFileSync(ctx, "utf8");
    if (/^\s*s\.dependency\s+['"]RCT-Folly['"]/.test(txt)) {
      console.error("[podspec-patch] ERROR: RCT-Folly dependency still present after patch.");
      process.exit(1);
    }
  }
}

main();
