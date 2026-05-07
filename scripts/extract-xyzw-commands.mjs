#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const defaultFiles = [
  "source_new_unpacked/__APP__/__APP__.decrypted/game.js",
  "source_new_unpacked/_subpackages_TEST_REMOTE_MODULE_/_subpackages_TEST_REMOTE_MODULE_.decrypted/subpackages/TEST_REMOTE_MODULE/game.js",
];

const inputFiles = process.argv.slice(2);
const files = inputFiles.length ? inputFiles : defaultFiles;

const commandPattern = /\b([a-z]+_[a-z0-9_]+(?:resp)?)\b/g;
const responsePattern = /\b([A-Z][A-Za-z0-9]+_[A-Za-z0-9_]*Resp)\b/g;

const byFile = {};
const commandCandidates = new Set();
const responses = new Set();

for (const file of files) {
  const absPath = path.resolve(file);
  if (!fs.existsSync(absPath)) {
    console.warn(`skip missing file: ${file}`);
    continue;
  }

  const content = fs.readFileSync(absPath, "utf8");
  const fileCommands = new Set();
  const fileResponses = new Set();

  for (const [, value] of content.matchAll(commandPattern)) {
    if (!value.includes("_")) continue;
    if (value.endsWith("resp")) {
      responses.add(value);
      fileResponses.add(value);
    } else {
      commandCandidates.add(value);
      fileCommands.add(value);
    }
  }

  for (const [, value] of content.matchAll(responsePattern)) {
    const normalized = value
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/__/g, "_")
      .toLowerCase();
    responses.add(normalized);
    fileResponses.add(normalized);
  }

  byFile[file] = {
    commands: [...fileCommands].sort(),
    responses: [...fileResponses].sort(),
  };
}

const responseBackedCommands = [...commandCandidates].filter((cmd) =>
  responses.has(`${cmd}resp`),
);

const result = {
  generatedAt: new Date().toISOString(),
  files,
  commandCandidateCount: commandCandidates.size,
  responseBackedCommandCount: responseBackedCommands.length,
  responseCount: responses.size,
  responseBackedCommands: responseBackedCommands.sort(),
  commandCandidates: [...commandCandidates].sort(),
  responses: [...responses].sort(),
  byFile,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
