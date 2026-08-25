import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const reportPath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!reportPath) {
  throw new Error("Usage: node fixPortableReportChromeScrollbarOverflow.mjs <report.html>");
}

const marker = "data-portable-chrome-scrollbar-guard";
const guard = `<style ${marker}>html,body{max-width:100%;overflow-x:hidden}.dashboard-shell.report-shell>.analytics-top-bar{width:calc(100% + 2 * var(--ds-gutter))!important;margin-right:calc(-1 * var(--ds-gutter))!important;margin-left:calc(-1 * var(--ds-gutter))!important}</style>`;
const html = readFileSync(reportPath, "utf8");

if (html.includes(marker)) {
  console.log(`${reportPath} already contains the portable Chrome scrollbar guard.`);
  process.exit(0);
}
if (!html.includes("</head>")) {
  throw new Error("The portable report does not contain a closing head element.");
}

writeFileSync(reportPath, html.replace("</head>", `${guard}</head>`), "utf8");
console.log(`Patched the portable Chrome scrollbar guard in ${reportPath}`);
