import { test } from "node:test";
import assert from "node:assert/strict";
import { isSignaturePr, extractSignatureLine, issueNumberOf } from "./signature-pr.mjs";

const validPr = () => ({
  number: 12,
  author: { login: "app/github-actions", is_bot: true },
  headRefName: "signature/issue-11",
  isCrossRepository: false,
  files: [{ path: "SIGNATORIES.md", additions: 1, deletions: 0 }],
});

test("accepts a bot signature PR that only appends one line", () => {
  assert.equal(isSignaturePr(validPr()), true);
});

test("rejects PRs not opened by github-actions", () => {
  assert.equal(isSignaturePr({ ...validPr(), author: { login: "someone", is_bot: false } }), false);
});

test("rejects branches outside signature/issue-N", () => {
  assert.equal(isSignaturePr({ ...validPr(), headRefName: "signature/issue-11-x" }), false);
  assert.equal(isSignaturePr({ ...validPr(), headRefName: "main" }), false);
});

test("rejects PRs from forks", () => {
  assert.equal(isSignaturePr({ ...validPr(), isCrossRepository: true }), false);
});

test("rejects PRs touching other files or more than one line", () => {
  const extra = [...validPr().files, { path: "index.html", additions: 1, deletions: 0 }];
  assert.equal(isSignaturePr({ ...validPr(), files: extra }), false);
  assert.equal(isSignaturePr({ ...validPr(), files: [{ path: "SIGNATORIES.md", additions: 2, deletions: 0 }] }), false);
  assert.equal(isSignaturePr({ ...validPr(), files: [{ path: "SIGNATORIES.md", additions: 1, deletions: 1 }] }), false);
});

test("extracts the single added line from a diff", () => {
  const diff = [
    "diff --git a/SIGNATORIES.md b/SIGNATORIES.md",
    "--- a/SIGNATORIES.md",
    "+++ b/SIGNATORIES.md",
    "@@ -12,3 +12,4 @@",
    " - Jorge del Casar, Head of Tech, Madrid",
    "+- Nacho Brito, Software Engineer, Spain",
  ].join("\n");
  assert.equal(extractSignatureLine(diff), "- Nacho Brito, Software Engineer, Spain");
});

test("rejects added lines with markup, links or mentions", () => {
  for (const bad of ["+- <b>x</b>", "+- see https://x.y", "+- @someone", "+- [x](y)", "+not a list item", "+- "]) {
    assert.equal(extractSignatureLine(`+++ b/SIGNATORIES.md\n${bad}`), null, bad);
  }
});

test("rejects diffs with zero or several added lines", () => {
  assert.equal(extractSignatureLine("+++ b/SIGNATORIES.md\n context"), null);
  assert.equal(extractSignatureLine("+++ b/SIGNATORIES.md\n+- Ana\n+- Luis"), null);
});

test("reads the issue number from the branch name", () => {
  assert.equal(issueNumberOf("signature/issue-13"), 13);
});
