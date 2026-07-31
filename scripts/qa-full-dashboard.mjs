import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.DIALDASH_QA_URL || "http://localhost:3100";
const output = "output/playwright";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await desktop.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Dashboard returned ${response?.status()}.`);
  await desktop.getByText("840", { exact: true }).first().waitFor();
  await desktop.getByText("22", { exact: true }).first().waitFor();
  await desktop.screenshot({ path: `${output}/full-dashboard-desktop.png`, fullPage: true });

  await desktop.getByLabel("View").selectOption("excluded");
  await desktop.getByText("Showing 100 of 362 prospects").waitFor();
  await desktop.getByPlaceholder(/Search host/).fill("Alex Epstein");
  await desktop.getByText("Showing 1 of 1 prospect").waitFor();
  await desktop.getByRole("button", { name: /Details/ }).click();
  await desktop.getByText(/EXISTING STRONG VIDEO CAPABILITY/i).first().waitFor();
  await desktop.getByText(/current official Improve The Planet channel/i).waitFor();
  await desktop.screenshot({ path: `${output}/full-dashboard-detail.png`, fullPage: true });

  await desktop.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await desktop.getByLabel("View").selectOption("pursue");
  await desktop.getByPlaceholder(/Search host/).fill("Rory Johnston");
  await desktop.getByText("Showing 1 of 1 prospect").waitFor();
  await desktop.getByRole("button", { name: /Details/ }).click();
  await desktop.getByRole("heading", { name: "Commercial Intelligence" }).waitFor();
  await desktop.getByText("$75 per month or $750 per year", { exact: false }).waitFor();
  await desktop.getByText("$200-$375/hour", { exact: false }).waitFor();
  await desktop.getByText("How this range was estimated", { exact: true }).first().waitFor();
  await desktop.getByText("PRICING VERIFIED", { exact: true }).waitFor();
  await desktop.getByRole("heading", { name: "Commercial Intelligence" }).scrollIntoViewIfNeeded();
  await desktop.screenshot({ path: `${output}/commercial-intelligence-rory.png`, fullPage: true });

  const reportResponse = await desktop.goto(`${baseUrl}/report`, { waitUntil: "networkidle" });
  if (!reportResponse?.ok()) throw new Error(`Report returned ${reportResponse?.status()}.`);
  await desktop.getByText("840 / 840 reviewed", { exact: false }).waitFor();
  await desktop.getByText("How to do the next run faster", { exact: false }).waitFor();
  await desktop.getByText("Commercial economics benchmark", { exact: false }).waitFor();
  await desktop.screenshot({ path: `${output}/full-review-report.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await mobile.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await mobile.getByText("22", { exact: true }).first().waitFor();
  await mobile.getByRole("heading", { name: "Rory Johnston" }).waitFor();
  const dimensions = await mobile.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  if (dimensions.scrollWidth > dimensions.width) throw new Error(`Mobile page overflows by ${dimensions.scrollWidth - dimensions.width}px.`);
  await mobile.getByRole("button", { name: /Details/ }).first().click();
  await mobile.getByRole("heading", { name: "Commercial Intelligence" }).waitFor();
  const detailDimensions = await mobile.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  if (detailDimensions.scrollWidth > detailDimensions.width) throw new Error(`Mobile detail overflows by ${detailDimensions.scrollWidth - detailDimensions.width}px.`);
  await mobile.screenshot({ path: `${output}/full-dashboard-mobile.png`, fullPage: true });

  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  console.log(JSON.stringify({
    status: "PASSED",
    totals: { reviewed: 840, pursue: 22, nurture: 456, excluded: 362 },
    screenshots: [
      `${output}/full-dashboard-desktop.png`,
      `${output}/full-dashboard-detail.png`,
      `${output}/commercial-intelligence-rory.png`,
      `${output}/full-review-report.png`,
      `${output}/full-dashboard-mobile.png`,
    ],
  }, null, 2));
} finally {
  await browser.close();
}
