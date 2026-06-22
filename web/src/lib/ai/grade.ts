import { spawn } from "node:child_process";
import os from "node:os";

export interface EssayGrade {
  score: number; // 0-10
  summary: string;
  criteria: { dimension: string; comment: string }[];
}

const SYSTEM = `You are the grading assistant for the RethinkX × KSE "Disruption" course. You grade short essays on a 0-10 scale against a rubric, in the spirit of Bradd Libby: rigorous but encouraging.

Return ONLY a JSON object, no prose around it, of the exact shape:
{"score": <integer 0-10>, "summary": "<2-3 sentence overall verdict>", "criteria": [{"dimension": "<rubric dimension>", "comment": "<one specific sentence>"}]}
Be concrete: cite what the student did or missed. Pass mark is 6/10.`;

export function gradeEssay(opts: {
  brief: string;
  rubric: unknown;
  essay: string;
}): Promise<EssayGrade | null> {
  const prompt = `ASSIGNMENT BRIEF:
${opts.brief}

RUBRIC:
${JSON.stringify(opts.rubric ?? "Conceptual accuracy, application to a real case, integration, clarity")}

STUDENT ESSAY:
${opts.essay.slice(0, 12000)}

Grade it now. Output JSON only.`;

  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      ["-p", "--model", "sonnet", "--append-system-prompt", SYSTEM, "--allowed-tools", ""],
      { cwd: os.tmpdir(), env: { ...process.env, HOME: process.env.HOME ?? "/home/ye" }, stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, 130_000);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", () => {
      clearTimeout(timer);
      const match = out.match(/\{[\s\S]*\}/);
      if (!match) return resolve(null);
      try {
        const parsed = JSON.parse(match[0]) as EssayGrade;
        parsed.score = Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0)));
        if (!Array.isArray(parsed.criteria)) parsed.criteria = [];
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
