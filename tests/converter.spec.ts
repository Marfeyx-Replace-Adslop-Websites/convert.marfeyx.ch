import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";

async function upload(page: Page, name: string, content: string | Buffer, mimeType = "text/plain") {
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name,
      mimeType,
      buffer: Buffer.isBuffer(content) ? content : Buffer.from(content),
    });
}
async function format(page: Page, name: string) {
  await page.getByRole("button", { name: /Convert to/ }).click();
  await page.getByRole("option", { name: new RegExp("^" + name + "(?: |$)") }).click();
}
async function convert(page: Page) {
  await page.getByRole("button", { name: "Convert file", exact: true }).click();
  await expect(page.getByRole("link", { name: "Download file" })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download file" }).click();
  const download = await pending;
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(Buffer.from(chunk));
  return { name: download.suggestedFilename(), bytes: Buffer.concat(chunks) };
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Browse files" })).toBeVisible();
});

test("empty controls are disabled; formats and privacy remain available", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Convert file", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Supported formats" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("tab", { name: "Audio & video" }).click();
  await expect(page.getByText("WAV audio", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Where are my files processed?" }).click();
  await expect(page.getByText(/File contents are not uploaded/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy policy" }).first()).toHaveAttribute(
    "href",
    "privacy.html",
  );
});

test("JSON formatting, minification, CSV output and stale-result clearing", async ({ page }) => {
  await upload(page, "people.json", '[{"name":"Alex","city":"Bern"}]', "application/json");
  let result = await convert(page);
  expect(result.name).toBe("people-pretty.json");
  expect(result.bytes.toString()).toContain("\n  {");
  await format(page, "Minified JSON");
  await expect(page.getByRole("link", { name: "Download file" })).not.toBeVisible();
  result = await convert(page);
  expect(result.bytes.toString()).toBe('[{"name":"Alex","city":"Bern"}]');
  await format(page, "CSV table");
  result = await convert(page);
  expect(result.name).toBe("people.csv");
  expect(result.bytes.toString()).toBe("name,city\nAlex,Bern\n");
});

test("CSV to JSON preserves quoted commas", async ({ page }) => {
  await upload(page, "table.csv", 'name,city\n"Alex, Morgan",Bern\n', "text/csv");
  await format(page, "JSON from CSV");
  const result = await convert(page);
  expect(JSON.parse(result.bytes.toString())).toEqual([{ name: "Alex, Morgan", city: "Bern" }]);
});

test("text to HTML escapes markup; plain text export is unchanged", async ({ page }) => {
  await upload(page, "notes.txt", '<script>alert("test")</script>');
  const result = await convert(page);
  expect(result.name).toBe("notes.html");
  expect(result.bytes.toString()).toContain("&lt;script&gt;");
  await upload(page, "notes.md", "# Test\nA note.");
  await format(page, "Plain text");
  expect((await convert(page)).bytes.toString()).toBe("# Test\nA note.");
});

test("ZIP packaging and extraction preserve file contents", async ({ page }) => {
  await upload(page, "notes.txt", "Keep this content.");
  await format(page, "ZIP archive");
  const packed = await convert(page);
  const zip = await JSZip.loadAsync(packed.bytes);
  expect(await zip.file("notes.txt")!.async("string")).toBe("Keep this content.");
  await upload(page, "bundle.zip", packed.bytes, "application/zip");
  const extracted = await convert(page);
  expect(extracted.name).toBe("bundle-extracted.zip");
  const unpacked = await JSZip.loadAsync(extracted.bytes);
  expect(await unpacked.file("notes.txt")!.async("string")).toBe("Keep this content.");
});

test("images export PNG, JPEG and WebP through the real canvas engine", async ({ page }) => {
  const source = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#806398";
    context.fillRect(0, 0, 16, 16);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await upload(page, "image.jpeg", Buffer.from(source, "base64"), "image/jpeg");
  let result = await convert(page);
  expect(result.bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await format(page, "JPEG image");
  result = await convert(page);
  expect(result.bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  await format(page, "WebP image");
  result = await convert(page);
  expect(result.bytes.subarray(8, 12).toString()).toBe("WEBP");
});

test("invalid JSON shows an error and a replacement file can still convert", async ({ page }) => {
  await upload(page, "broken.json", "{broken", "application/json");
  await page.getByRole("button", { name: "Convert file", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Conversion could not be completed");
  await expect(page.getByRole("link", { name: "Download file" })).not.toBeVisible();
  await page.getByRole("button", { name: "Clear file", exact: true }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  await upload(page, "valid.json", "{}", "application/json");
  expect((await convert(page)).bytes.toString()).toBe("{}");
});

test("drag and drop accepts one file and rejects multiple files", async ({ page }) => {
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["hello"], "dropped.txt", { type: "text/plain" }));
    return data;
  });
  await page.locator(".dropzone").dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByRole("heading", { name: "dropped.txt" })).toBeVisible();
  expect((await convert(page)).name).toBe("dropped.html");
  const multiple = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["one"], "one.txt"));
    data.items.add(new File(["two"], "two.txt"));
    return data;
  });
  await page.locator(".dropzone").dispatchEvent("drop", { dataTransfer: multiple });
  await expect(page.getByRole("alert")).toContainText("Choose one file at a time");
});

test("media loading locks controls and an engine-download failure is recoverable", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://unpkg.com/**", async (route) => {
    await pending;
    await route.abort();
  });
  await upload(page, "audio.wav", Buffer.alloc(44), "audio/wav");
  await format(page, "MP3 audio");
  await page.getByRole("button", { name: "Convert file", exact: true }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose another file" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear file", exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Convert file", exact: true })).toBeEnabled();
});

for (const width of [320, 390, 768, 1440]) {
  test(
    "responsive layout at " + width + "px has no horizontal overflow",
    async ({ page }, info) => {
      await page.setViewportSize({ width, height: 950 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath("converter.png"), fullPage: true });
    },
  );
}
