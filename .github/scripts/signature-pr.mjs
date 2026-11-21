// Pure checks for the PRs opened by the "Sign the manifesto" workflow.

const BOT_LOGIN = "app/github-actions";
const BRANCH = /^signature\/issue-(\d+)$/;
const FILE = "SIGNATORIES.md";
// Same characters sign.mjs strips, except the comma that separates the fields.
const FORBIDDEN = /[<>[\]()`|*_~#!\\@]|https?:\/\/|www\./i;
const LINE = /^- \S[^\r\n]{0,250}$/;

export function isSignaturePr(pr) {
  const [file, ...others] = pr.files ?? [];
  return (
    pr.author?.is_bot === true &&
    pr.author.login === BOT_LOGIN &&
    pr.isCrossRepository === false &&
    BRANCH.test(pr.headRefName) &&
    others.length === 0 &&
    file?.path === FILE &&
    file.additions === 1 &&
    file.deletions === 0
  );
}

export function extractSignatureLine(diff) {
  const added = diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1));
  if (added.length !== 1) return null;
  const [line] = added;
  return LINE.test(line) && !FORBIDDEN.test(line) ? line : null;
}

export function issueNumberOf(branch) {
  return Number(BRANCH.exec(branch)[1]);
}
