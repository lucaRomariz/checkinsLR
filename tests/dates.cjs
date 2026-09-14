const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("lib/dates.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: exportsObject, Intl, Date },
);
const { todayKey, validDate, addDays, weekStart, isOverdue } = exportsObject;
assert.equal(todayKey(new Date("2026-09-15T02:59:59Z")), "2026-09-14");
assert.equal(todayKey(new Date("2026-09-15T03:00:00Z")), "2026-09-15");
assert.equal(weekStart("2026-09-13"), "2026-09-07");
assert.equal(weekStart("2026-09-14"), "2026-09-14");
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(validDate("2026-02-30"), false);
assert.equal(validDate("2028-02-29"), true);
assert.equal(
  isOverdue("2026-09-14", null, new Date("2026-09-15T02:00:00Z")),
  false,
);
assert.equal(
  isOverdue("2026-09-14", "18:00", new Date("2026-09-14T22:00:00Z")),
  true,
);
console.log("9 date and timezone assertions passed.");
