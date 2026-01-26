/* metro.config.js */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function safeRequire(name) {
  try {
    return require(name);
  } catch (err) {
    console.error(`\n❌ metro.config.js: failed to require("${name}")`);
    console.error(err);
    throw err;
  }
}

function mustExist(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ metro.config.js: ${label} not found at: ${filePath}`);
    console.error(`cwd: ${process.cwd()}`);
    console.error(`node: ${process.version}`);
    try {
      console.error("repo root files:", fs.readdirSync(process.cwd()).slice(0, 50));
    } catch (e) {
      console.error("failed to list cwd files:", e);
    }
    throw new Error(`${label} missing at ${filePath}`);
  }
}

console.error(`\nℹ️ metro.config.js loading... node=${process.version} cwd=${process.cwd()}`);

const { getDefaultConfig } = safeRequire("expo/metro-config");
const { withNativeWind } = safeRequire("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;

// You can override this in EAS with an env var if needed.
const cssInput = process.env.NATIVEWIND_INPUT || "./global.css";
const cssPath = path.resolve(__dirname, cssInput);

mustExist(cssPath, "NativeWind CSS input");

module.exports = withNativeWind(config, { input: cssInput });
