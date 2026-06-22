import { spawn } from "node:child_process";
import os from "node:os";

/**
 * AI mentor backed by the local Claude Code CLI (`claude -p`), not the HTTP API.
 * The Next service runs as user `ye`, so it inherits that user's Claude auth.
 * If the CLI is unavailable, callers fall back to scripted mentor content.
 */

export interface MentorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface MentorContext {
  courseTitle: string;
  moduleTitle?: string;
  itemTitle?: string;
  itemType?: string;
  pageExcerpt?: string; // text of the lesson/quiz the student is looking at
  quizScore?: { score: number; total: number } | null;
  studentName?: string;
}

const PERSONA = `You are Bradd Libby, the AI mentor inside the "Disruption" course (RethinkX × Kyiv School of Economics).

IMPORTANT — you CAN see the exact page the student is on: its title and content are provided to you below under "WHAT THE STUDENT IS READING". Always ground your answer in that specific page. Refer to what's actually on it ("the four scales you just read", "the S-curve in this lesson"). Never say you can't see the page.

Voice: warm, sharp, concise. You teach disruption thinking — S-curves, cost curves (Wright's law), the Seba Technology Disruption Framework, system flips, why change is non-linear. Gently expose the linear-thinking "myth" hiding in a question. Use concrete cases (Edison's bulb, the 1898 ice industry, EVs, solar, incumbent death spirals).

Rules:
- Keep it tight: 1-3 short paragraphs. End with one sharp follow-up question.
- If the student failed the mastery check, name the exact misconception from this block and re-teach just that, then give one quick check.
- You are an AI tutor, not the real person. Plain prose — no markdown headings, no tool use.`;

function buildContextBlock(ctx: MentorContext): string {
  const parts: string[] = [`COURSE: ${ctx.courseTitle}`];
  if (ctx.moduleTitle) parts.push(`MODULE: ${ctx.moduleTitle}`);
  if (ctx.itemTitle) parts.push(`CURRENT PAGE: ${ctx.itemTitle} (${ctx.itemType ?? "lesson"})`);
  if (ctx.studentName) parts.push(`STUDENT: ${ctx.studentName}`);
  if (ctx.quizScore) parts.push(`QUIZ RESULT: ${ctx.quizScore.score}/${ctx.quizScore.total}`);
  if (ctx.pageExcerpt) {
    const excerpt = ctx.pageExcerpt.replace(/\s+/g, " ").slice(0, 4000);
    parts.push(`\nWHAT THE STUDENT IS READING (excerpt):\n${excerpt}`);
  }
  return parts.join("\n");
}

export interface MentorResult {
  text: string;
  source: "claude-cli" | "error";
}

const CLI_TIMEOUT_MS = 120_000;

export function mentorAvailable(): boolean {
  // The CLI is the transport; assume present unless a spawn fails.
  return true;
}

export async function mentorReply(
  messages: MentorTurn[],
  ctx: MentorContext,
): Promise<MentorResult> {
  const contextBlock = buildContextBlock(ctx);
  const convo = messages
    .map((m) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.content}`)
    .join("\n\n");
  const prompt = `${contextBlock}\n\n--- Conversation ---\n${convo}\n\nMentor:`;

  return runClaudeCLI(prompt);
}

function runClaudeCLI(prompt: string): Promise<MentorResult> {
  return new Promise((resolve) => {
    const child = spawn(
      "claude",
      [
        "-p",
        "--model",
        "sonnet", // faster than the default for chat-latency
        "--append-system-prompt",
        PERSONA,
        "--allowed-tools",
        "", // pure chat: no file/tool access
      ],
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
      resolve({ text: "", source: "error" });
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ text: "", source: "error" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      if (code === 0 && text) resolve({ text, source: "claude-cli" });
      else {
        console.error("[mentor] claude CLI failed", code, err.slice(0, 500));
        resolve({ text: "", source: "error" });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
