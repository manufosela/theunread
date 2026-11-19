// Turns a "Sign the manifesto" issue into a line in SIGNATORIES.md.
// Reads the issue body from the environment; never interpolates it into a shell.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const FILE = "SIGNATORIES.md";
const body = process.env.ISSUE_BODY ?? "";

function field(label) {
  const m = body.match(new RegExp(`^### ${label}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`, "m"));
  const v = m ? m[1].trim() : "";
  return v === "_No response_" ? "" : v;
}

// One plain-text line: no markup, no commas (they separate the fields), bounded length.
function clean(s) {
  return s
    .replace(/(https?:\/\/|www\.)\S*/gi, " ")
    .replace(/@/g, " ")
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/[<>\[\]()`|*_~#!\\,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const parts = [field("Name"), field("Role or company"), field("City or country")].map(clean);
if (!parts[0]) {
  console.log("No valid name; skipping.");
  appendFileSync(process.env.GITHUB_OUTPUT, "changed=false\nreason=invalid\n");
  process.exit(0);
}

const line = `- ${parts.filter(Boolean).join(", ")}`;
const current = readFileSync(FILE, "utf8");
if (current.split("\n").includes(line)) {
  appendFileSync(process.env.GITHUB_OUTPUT, "changed=false\nreason=duplicate\n");
  process.exit(0);
}

writeFileSync(FILE, current.replace(/\n*$/, "\n") + line + "\n");
appendFileSync(process.env.GITHUB_OUTPUT, `changed=true\nline=${line}\n`);
