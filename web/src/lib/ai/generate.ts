import { spawn } from "node:child_process";
import os from "node:os";

/**
 * AI exercise generator backed by the local Claude Code CLI (`claude -p`),
 * not the HTTP API — the Next service runs as a user with Claude auth.
 * Mirrors the spawn shape used in `grade.ts` / `mentor.ts`.
 *
 * Returned objects match the cross-agent content contract EXACTLY:
 *  - mcq:      { format:"mcq", questions:[{q,options:[4],correct,feedback}], passThreshold:3 }
 *  - matching: { format:"matching", instructions, pairs:[{left,right}], passThreshold }
 *  - ordering: { format:"ordering", instructions, items:[strings in CORRECT order] }
 */

export type ExerciseKind = "mcq" | "matching" | "ordering";

export interface McqExercise {
  format: "mcq";
  questions: { q: string; options: string[]; correct: number; feedback: string }[];
  passThreshold: number;
}

export interface MatchingExercise {
  format: "matching";
  instructions: string;
  pairs: { left: string; right: string }[];
  passThreshold: number;
}

export interface OrderingExercise {
  format: "ordering";
  instructions: string;
  items: string[];
}

export type GeneratedExercise = McqExercise | MatchingExercise | OrderingExercise;

const CLI_TIMEOUT_MS = 130_000;

const BASE_PERSONA = `You author short, formative exercises for the RethinkX × KSE "Disruption" course (in the spirit of Tony Seba and Bradd Libby).

The course teaches disruption thinking: S-curves, cost curves (Wright's law), the Seba Technology Disruption Framework, system flips, and why change is non-linear and exponential. Lean on the course's signature concrete cases — Edison's light bulb vs. gas lamps, the 1898 natural ice industry collapse, electric vehicles, and solar power — and gently expose the linear-thinking "myth" hiding in each topic.

Write exercises that are genuinely on-topic, intellectually honest, and a little bit fun. No trick questions; every item must have one defensible correct answer.

CRITICAL OUTPUT RULE: respond with a SINGLE JSON object and NOTHING else. No markdown fences, no commentary, no leading or trailing prose.`;

function instructionsFor(kind: ExerciseKind): string {
  switch (kind) {
    case "mcq":
      return `${BASE_PERSONA}

Produce a multiple-choice quiz with EXACTLY 3 questions. Output JSON of this EXACT shape:
{"format":"mcq","questions":[{"q":"<question>","options":["<a>","<b>","<c>","<d>"],"correct":<0-based index of the correct option>,"feedback":"<one sentence explaining why>"}],"passThreshold":3}
Each question MUST have EXACTLY 4 options. "correct" is the 0-based index into that question's options. Set "passThreshold" to 3.`;
    case "matching":
      return `${BASE_PERSONA}

Produce a matching exercise. Output JSON of this EXACT shape:
{"format":"matching","instructions":"<short instruction sentence>","pairs":[{"left":"<term>","right":"<its match>"}],"passThreshold":<integer>}
Include 4 to 6 pairs. Each "left" matches exactly one "right". Set "passThreshold" to the number of pairs.`;
    case "ordering":
      return `${BASE_PERSONA}

Produce an ordering exercise. Output JSON of this EXACT shape:
{"format":"ordering","instructions":"<short instruction telling the learner to put the items in order>","items":["<step 1>","<step 2>","..."]}
Include 4 to 6 items. List them in the CORRECT order (the UI will shuffle them for the learner).`;
  }
}

function buildPrompt(topic: string, context: string, kind: ExerciseKind): string {
  const parts: string[] = [`TOPIC: ${topic || "core disruption-thinking concept"}`];
  const trimmed = context.replace(/\s+/g, " ").trim().slice(0, 3000);
  if (trimmed) {
    parts.push(`\nLESSON CONTEXT (ground the exercise in this material):\n${trimmed}`);
  }
  parts.push(
    `\nGenerate the ${kind} exercise now. Output JSON only — a single object, no prose.`,
  );
  return parts.join("\n");
}

/** Run the Claude CLI and resolve the raw stdout (or null on failure/timeout). */
function runClaudeCLI(systemPrompt: string, prompt: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      ["-p", "--model", "sonnet", "--append-system-prompt", systemPrompt, "--allowed-tools", ""],
      {
        cwd: os.tmpdir(),
        env: { ...process.env, HOME: process.env.HOME ?? "/home/ye" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      if (code === 0 && text) resolve(text);
      else {
        console.error("[generate] claude CLI failed", code, err.slice(0, 500));
        resolve(null);
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Extract and parse the first {...} JSON block from raw model output. */
function extractJson(raw: string): unknown | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function validateMcq(data: Record<string, unknown>): McqExercise | null {
  const rawQs = Array.isArray(data.questions) ? data.questions : [];
  const questions = rawQs
    .map((raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const q = raw as Record<string, unknown>;
      const options = (Array.isArray(q.options) ? q.options : []).map(asString).slice(0, 4);
      if (options.length < 4) return null;
      let correct = Math.round(Number(q.correct));
      if (!Number.isFinite(correct)) correct = 0;
      correct = Math.max(0, Math.min(3, correct));
      const text = asString(q.q).trim();
      if (!text) return null;
      return { q: text, options, correct, feedback: asString(q.feedback).trim() };
    })
    .filter((x): x is McqExercise["questions"][number] => x !== null);

  if (questions.length === 0) return null;
  return { format: "mcq", questions, passThreshold: 3 };
}

function validateMatching(data: Record<string, unknown>): MatchingExercise | null {
  const rawPairs = Array.isArray(data.pairs) ? data.pairs : [];
  const pairs = rawPairs
    .map((raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const p = raw as Record<string, unknown>;
      const left = asString(p.left).trim();
      const right = asString(p.right).trim();
      if (!left || !right) return null;
      return { left, right };
    })
    .filter((x): x is MatchingExercise["pairs"][number] => x !== null);

  if (pairs.length < 2) return null;
  let passThreshold = Math.round(Number(data.passThreshold));
  if (!Number.isFinite(passThreshold) || passThreshold <= 0 || passThreshold > pairs.length) {
    passThreshold = pairs.length;
  }
  return {
    format: "matching",
    instructions: asString(data.instructions).trim() || "Match each item on the left to its pair on the right.",
    pairs,
    passThreshold,
  };
}

function validateOrdering(data: Record<string, unknown>): OrderingExercise | null {
  const items = (Array.isArray(data.items) ? data.items : [])
    .map(asString)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (items.length < 2) return null;
  return {
    format: "ordering",
    instructions: asString(data.instructions).trim() || "Put the following in the correct order.",
    items,
  };
}

export async function generateExercise(opts: {
  topic: string;
  context: string;
  kind: ExerciseKind;
}): Promise<GeneratedExercise | null> {
  const { topic, context, kind } = opts;
  if (kind !== "mcq" && kind !== "matching" && kind !== "ordering") return null;

  const raw = await runClaudeCLI(instructionsFor(kind), buildPrompt(topic, context, kind));
  if (!raw) return null;

  const parsed = extractJson(raw);
  if (typeof parsed !== "object" || parsed === null) return null;
  const data = parsed as Record<string, unknown>;

  switch (kind) {
    case "mcq":
      return validateMcq(data);
    case "matching":
      return validateMatching(data);
    case "ordering":
      return validateOrdering(data);
  }
}
