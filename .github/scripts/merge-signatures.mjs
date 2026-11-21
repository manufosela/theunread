// Merges the open signature PRs one by one. Each PR branch is rebuilt as
// "current main + its line" before merging, so several signatures that all
// append to the end of SIGNATORIES.md never conflict with each other.
// PRs that do not look exactly like a form signature are left for a human.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { isSignaturePr, extractSignatureLine, issueNumberOf } from "./signature-pr.mjs";

const FILE = "SIGNATORIES.md";
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });
const gh = (...args) => run("gh", args);
const git = (...args) => run("git", args);

async function mergeWhenReady(number) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      gh("pr", "merge", String(number), "--merge", "--delete-branch");
      return;
    } catch (error) {
      if (attempt === 10) throw error;
      await sleep(6000);
    }
  }
}

const prs = JSON.parse(
  gh("pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,author,headRefName,isCrossRepository,files"),
).toSorted((a, b) => a.number - b.number);

let merged = 0;
for (const pr of prs) {
  if (!isSignaturePr(pr)) continue;
  const line = extractSignatureLine(gh("pr", "diff", String(pr.number)));
  if (!line) {
    console.log(`#${pr.number}: line does not pass validation, left for review.`);
    continue;
  }

  git("fetch", "origin", "main");
  git("checkout", "-B", pr.headRefName, "origin/main");
  const current = readFileSync(FILE, "utf8");

  if (current.split("\n").includes(line)) {
    const issue = String(issueNumberOf(pr.headRefName));
    gh("pr", "close", String(pr.number), "--delete-branch", "--comment", "Already in SIGNATORIES.md.");
    gh("issue", "close", issue, "--comment", "This name is already in SIGNATORIES.md. Thanks for signing!");
    console.log(`#${pr.number}: duplicate, closed.`);
    continue;
  }

  writeFileSync(FILE, `${current.replace(/\n*$/, "\n")}${line}\n`);
  git("add", FILE);
  git("commit", "-m", `Add signature from issue #${issueNumberOf(pr.headRefName)}`);
  git("push", "--force", "origin", pr.headRefName);
  await mergeWhenReady(pr.number);
  merged++;
  console.log(`#${pr.number}: merged.`);
}

console.log(`Merged ${merged} signature PR(s).`);
// Merges made with GITHUB_TOKEN may not start a Pages build on their own.
if (merged > 0) gh("api", "-X", "POST", "repos/{owner}/{repo}/pages/builds");
