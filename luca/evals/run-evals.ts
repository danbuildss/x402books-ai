/**
 * Luca eval runner.
 *
 * Usage:  npx tsx luca/evals/run-evals.ts [--agent-url http://localhost:3000/api/luca/chat]
 *
 * Feeds each eval case to Luca, then scores the response:
 *   1. figure traceability (verify-response.ts)
 *   2. must_say / must_not_say phrase checks
 *   3. forbidden-phrase check
 *
 * Exit code 1 if any case fails — wire into CI to block prompt/model regressions.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { verifyLucaResponse, checkForbiddenPhrases } from "../src/verify-response";

interface EvalCase {
  id: string;
  category: string;
  question: string;
  fixture: Record<string, unknown>;
  must_say?: string[];
  must_not_say?: string[];
  notes?: string;
}

interface LucaReply {
  answer: string;
  skillResponses: Array<{ skill: string; body: unknown }>;
}

const cases: EvalCase[] = readFileSync(join(__dirname, "luca-evals.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

async function askLuca(question: string, fixture: Record<string, unknown>): Promise<LucaReply> {
  const url = process.argv.find((a) => a.startsWith("--agent-url="))?.split("=")[1]
    ?? process.env.LUCA_CHAT_URL
    ?? "http://localhost:3000/api/luca/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, fixture }),
  });
  if (!res.ok) throw new Error(`luca chat ${res.status}: ${await res.text()}`);
  return res.json() as Promise<LucaReply>;
}

async function main() {
  let pass = 0;
  const failures: string[] = [];

  for (const c of cases) {
    try {
      const reply = await askLuca(c.question, c.fixture);
      const problems: string[] = [];

      const v = verifyLucaResponse(reply.answer, reply.skillResponses);
      if (!v.ok) problems.push(`uncited figures: ${v.uncited.join(", ")}`);

      const f = checkForbiddenPhrases(reply.answer);
      if (!f.ok) problems.push(`forbidden phrasing: ${f.hits.join("; ")}`);

      for (const phrase of c.must_say ?? []) {
        if (!reply.answer.toLowerCase().includes(phrase.toLowerCase())) {
          problems.push(`missing required phrase: "${phrase}"`);
        }
      }
      for (const phrase of c.must_not_say ?? []) {
        if (reply.answer.toLowerCase().includes(phrase.toLowerCase())) {
          problems.push(`contains forbidden phrase: "${phrase}"`);
        }
      }

      if (problems.length === 0) {
        pass++;
        console.log(`PASS ${c.id} (${c.category})`);
      } else {
        failures.push(c.id);
        console.log(`FAIL ${c.id} (${c.category})\n  - ${problems.join("\n  - ")}`);
      }
    } catch (err) {
      failures.push(c.id);
      console.log(`ERROR ${c.id}: ${(err as Error).message}`);
    }
  }

  console.log(`\n${pass}/${cases.length} passed`);
  if (failures.length > 0) {
    console.error(`Failing cases: ${failures.join(", ")}`);
    process.exit(1);
  }
}

main();
