import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, work } from "./build.mjs";
import { extractDelimitedMath } from "./tex.mjs";

export function runSymbolicChecks(jobs) {
  const python = join(work, "sympy-env", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  if (!existsSync(python)) return { engine: "sympy", status: "unavailable", checks: jobs.map((job) => ({ id: job.id, status: "unsupported", reason: "Run the documented isolated SymPy setup" })) };
  const result = spawnSync(python, ["-X", "utf8", join(root, "scripts/source-first/symbolic-check.py")], { input: JSON.stringify({ jobs }), encoding: "utf8", windowsHide: true, timeout: 20000, maxBuffer: 2*1024*1024 });
  if (result.status !== 0) return { engine: "sympy", status: "failed", checks: jobs.map((job) => ({ id: job.id, status: "unsupported", reason: result.error?.message ?? result.stderr })) };
  return JSON.parse(result.stdout);
}

export function pilotSymbolicJobs(corrections) {
  const math = (text) => extractDelimitedMath(text).map((entry) => entry.raw);
  return corrections.filter((entry) => entry.recordId !== "knowledge:14.1").map((entry) => {
    const statement = math(entry.fields.find((field) => field.field === "prompt").after);
    const answer = math(entry.fields.find((field) => field.field === "answer").after);
    const derivative = answer.find((value) => value.startsWith(entry.recordId.startsWith("1.2") ? "f'(x)=" : "y'="));
    return { id: entry.id, kind: "derivative", expression: statement[0]?.split("=").slice(1).join("="), expected: derivative?.split("=").slice(1).join("="),
      functionDomain: entry.recordId.startsWith("1.2") ? answer.find((value) => value.includes("\\ne")) : answer.find((value) => value.startsWith("D="))?.slice(2),
      derivativeDomain: entry.recordId.startsWith("1.2") ? answer.find((value) => value.includes("\\ne")) : answer.find((value) => value.includes("<")),
      ...(entry.recordId.startsWith("1.2") ? { valueAt: 2, value: answer.find((value) => value.startsWith("f'(2)="))?.split("=")[1] } : {}) };
  });
}
