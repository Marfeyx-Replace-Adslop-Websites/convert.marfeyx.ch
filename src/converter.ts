import JSZip from "jszip";

export type FileCategory = "image" | "media" | "text" | "data" | "archive" | "unknown";

export type TargetFormat = {
  id: string;
  label: string;
  extension: string;
  mime: string;
  category: FileCategory;
  description: string;
  handler: "image" | "json-pretty" | "json-minify" | "json-to-csv" | "csv-to-json" | "text-to-html" | "zip" | "unzip" | "ffmpeg";
};

export type ConversionProgress = {
  phase: string;
  percent?: number;
};

export type ConversionResult = {
  blob: Blob;
  fileName: string;
  message: string;
};

export type ConvertOptions = {
  onProgress?: (progress: ConversionProgress) => void;
};

type LoadedFfmpeg = {
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
  readFile: (path: string) => Promise<Uint8Array | string>;
  deleteFile: (path: string) => Promise<boolean>;
  exec: (args: string[]) => Promise<number>;
  on: (event: "progress", callback: (event: { progress: number }) => void) => void;
  loaded: boolean;
  load: (options?: unknown) => Promise<boolean>;
};

const imageTargets: TargetFormat[] = [
  {
    id: "png",
    label: "PNG image",
    extension: "png",
    mime: "image/png",
    category: "image",
    description: "Best for sharp graphics and transparent images.",
    handler: "image",
  },
  {
    id: "jpg",
    label: "JPEG image",
    extension: "jpg",
    mime: "image/jpeg",
    category: "image",
    description: "Best for smaller photos without transparency.",
    handler: "image",
  },
  {
    id: "webp",
    label: "WebP image",
    extension: "webp",
    mime: "image/webp",
    category: "image",
    description: "Modern image format with compact file sizes.",
    handler: "image",
  },
];

const textTargets: TargetFormat[] = [
  {
    id: "txt",
    label: "Plain text",
    extension: "txt",
    mime: "text/plain",
    category: "text",
    description: "Save readable text without formatting.",
    handler: "text-to-html",
  },
  {
    id: "html",
    label: "HTML document",
    extension: "html",
    mime: "text/html",
    category: "text",
    description: "Wrap readable text in a simple local HTML file.",
    handler: "text-to-html",
  },
];

const dataTargets: TargetFormat[] = [
  {
    id: "json-pretty",
    label: "Pretty JSON",
    extension: "json",
    mime: "application/json",
    category: "data",
    description: "Format JSON with indentation.",
    handler: "json-pretty",
  },
  {
    id: "json-min",
    label: "Minified JSON",
    extension: "json",
    mime: "application/json",
    category: "data",
    description: "Compress JSON by removing whitespace.",
    handler: "json-minify",
  },
  {
    id: "csv",
    label: "CSV table",
    extension: "csv",
    mime: "text/csv",
    category: "data",
    description: "Convert a JSON array or object list into CSV.",
    handler: "json-to-csv",
  },
  {
    id: "json-from-csv",
    label: "JSON from CSV",
    extension: "json",
    mime: "application/json",
    category: "data",
    description: "Convert a CSV table into JSON objects.",
    handler: "csv-to-json",
  },
];

const archiveTargets: TargetFormat[] = [
  {
    id: "zip",
    label: "ZIP archive",
    extension: "zip",
    mime: "application/zip",
    category: "archive",
    description: "Package this file into a local ZIP archive.",
    handler: "zip",
  },
  {
    id: "unzip",
    label: "Extract ZIP",
    extension: "zip",
    mime: "application/zip",
    category: "archive",
    description: "Extract files and download them as a cleaned ZIP bundle.",
    handler: "unzip",
  },
];

const mediaTargets: TargetFormat[] = [
  {
    id: "mp4",
    label: "MP4 video",
    extension: "mp4",
    mime: "video/mp4",
    category: "media",
    description: "Common video container. Large files may take a while.",
    handler: "ffmpeg",
  },
  {
    id: "webm",
    label: "WebM video",
    extension: "webm",
    mime: "video/webm",
    category: "media",
    description: "Browser-friendly video format.",
    handler: "ffmpeg",
  },
  {
    id: "mp3",
    label: "MP3 audio",
    extension: "mp3",
    mime: "audio/mpeg",
    category: "media",
    description: "Extract or convert audio into MP3.",
    handler: "ffmpeg",
  },
  {
    id: "wav",
    label: "WAV audio",
    extension: "wav",
    mime: "audio/wav",
    category: "media",
    description: "Uncompressed audio for editing.",
    handler: "ffmpeg",
  },
  {
    id: "ogg",
    label: "Ogg audio",
    extension: "ogg",
    mime: "audio/ogg",
    category: "media",
    description: "Open audio format for compact files.",
    handler: "ffmpeg",
  },
];

export const allTargets = [...imageTargets, ...mediaTargets, ...textTargets, ...dataTargets, ...archiveTargets];

let ffmpegInstance: LoadedFfmpeg | null = null;

export function getFileCategory(file: File): FileCategory {
  const extension = getExtension(file.name);
  if (file.type.startsWith("image/") || ["heic", "heif", "bmp", "tif", "tiff", "avif"].includes(extension)) {
    return "image";
  }

  if (
    file.type.startsWith("audio/") ||
    file.type.startsWith("video/") ||
    ["mp4", "mov", "mkv", "webm", "avi", "mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)
  ) {
    return "media";
  }

  if (extension === "zip" || file.type === "application/zip") {
    return "archive";
  }

  if (["json", "csv"].includes(extension) || file.type.includes("json") || file.type.includes("csv")) {
    return "data";
  }

  if (file.type.startsWith("text/") || ["txt", "md", "log", "xml", "html", "css", "js", "ts"].includes(extension)) {
    return "text";
  }

  return "unknown";
}

export function getTargetsForFile(file: File | null): TargetFormat[] {
  if (!file) return [];

  const category = getFileCategory(file);
  const extension = getExtension(file.name);
  const targets: TargetFormat[] = [];

  if (category === "image") targets.push(...imageTargets);
  if (category === "media") targets.push(...mediaTargets);
  if (category === "text") targets.push(...textTargets, archiveTargets[0]);
  if (category === "data") {
    targets.push(...dataTargets, ...textTargets, archiveTargets[0]);
  }
  if (category === "archive") targets.push(...archiveTargets);
  if (category === "unknown") targets.push(archiveTargets[0]);

  return targets.filter((target) => target.id !== extension);
}

export async function convertFile(file: File, target: TargetFormat, options: ConvertOptions = {}): Promise<ConversionResult> {
  options.onProgress?.({ phase: "Reading file", percent: 5 });

  if (target.handler === "image") {
    return convertImage(file, target, options);
  }

  if (target.handler === "json-pretty" || target.handler === "json-minify") {
    const parsed = JSON.parse(await file.text());
    const output = target.handler === "json-pretty" ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    return textResult(file, target, output, "JSON converted locally.");
  }

  if (target.handler === "json-to-csv") {
    return textResult(file, target, jsonToCsv(JSON.parse(await file.text())), "JSON converted to CSV locally.");
  }

  if (target.handler === "csv-to-json") {
    return textResult(file, target, JSON.stringify(csvToJson(await file.text()), null, 2), "CSV converted to JSON locally.");
  }

  if (target.handler === "text-to-html") {
    const text = await file.text();
    const output =
      target.id === "html"
        ? `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(stripExtension(file.name))}</title>
  </head>
  <body>
    <pre>${escapeHtml(text)}</pre>
  </body>
</html>
`
        : text;
    return textResult(file, target, output, "Text converted locally.");
  }

  if (target.handler === "zip") {
    return zipSingleFile(file, target, options);
  }

  if (target.handler === "unzip") {
    return unzipFile(file, target, options);
  }

  if (target.handler === "ffmpeg") {
    return convertWithFfmpeg(file, target, options);
  }

  throw new Error("This conversion is not supported locally yet.");
}

function textResult(file: File, target: TargetFormat, output: string, message: string): ConversionResult {
  return {
    blob: new Blob([output], { type: `${target.mime};charset=utf-8` }),
    fileName: withExtension(file.name, target.extension, target.id),
    message,
  };
}

async function convertImage(file: File, target: TargetFormat, options: ConvertOptions): Promise<ConversionResult> {
  options.onProgress?.({ phase: "Decoding image", percent: 25 });

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not create a canvas for image conversion.");

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  options.onProgress?.({ phase: "Encoding image", percent: 70 });
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, target.mime, target.mime === "image/jpeg" ? 0.92 : undefined);
  });

  if (!blob) {
    throw new Error(`This browser cannot export ${target.label}. Try PNG or JPEG instead.`);
  }

  return {
    blob,
    fileName: withExtension(file.name, target.extension, target.id),
    message: "Image converted locally in your browser.",
  };
}

async function zipSingleFile(file: File, target: TargetFormat, options: ConvertOptions): Promise<ConversionResult> {
  options.onProgress?.({ phase: "Creating ZIP archive", percent: 45 });
  const zip = new JSZip();
  zip.file(file.name, file);
  const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
    options.onProgress?.({ phase: "Compressing ZIP", percent: Math.round(metadata.percent) });
  });

  return {
    blob,
    fileName: withExtension(file.name, target.extension, target.id),
    message: "ZIP archive created locally.",
  };
}

async function unzipFile(file: File, target: TargetFormat, options: ConvertOptions): Promise<ConversionResult> {
  options.onProgress?.({ phase: "Reading ZIP archive", percent: 20 });
  const inputZip = await JSZip.loadAsync(file);
  const outputZip = new JSZip();
  const entries = Object.values(inputZip.files).filter((entry) => !entry.dir);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const blob = await entry.async("blob");
    outputZip.file(entry.name, blob);
    options.onProgress?.({ phase: "Extracting files", percent: Math.round(((index + 1) / entries.length) * 80) });
  }

  const blob = await outputZip.generateAsync({ type: "blob" });
  return {
    blob,
    fileName: `${stripExtension(file.name)}-extracted.${target.extension}`,
    message: `${entries.length} file${entries.length === 1 ? "" : "s"} extracted locally into a new ZIP.`,
  };
}

async function convertWithFfmpeg(file: File, target: TargetFormat, options: ConvertOptions): Promise<ConversionResult> {
  options.onProgress?.({ phase: "Loading local media engine", percent: 8 });
  const ffmpeg = await loadFfmpeg(options);
  const inputName = `input.${getExtension(file.name) || "bin"}`;
  const outputName = `output.${target.extension}`;

  options.onProgress?.({ phase: "Writing file to browser memory", percent: 18 });
  ffmpeg.on("progress", ({ progress }) => {
    options.onProgress?.({ phase: "Converting media locally", percent: Math.min(95, Math.max(20, Math.round(progress * 90))) });
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, bytes);

  const args = buildFfmpegArgs(inputName, outputName, target.extension);
  const exitCode = await ffmpeg.exec(args);
  if (exitCode !== 0) {
    throw new Error("FFmpeg could not convert this file in the browser.");
  }

  const output = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  return {
    blob: new Blob([typeof output === "string" ? output : output.slice()], { type: target.mime }),
    fileName: withExtension(file.name, target.extension, target.id),
    message: "Media converted locally with FFmpeg.wasm.",
  };
}

async function loadFfmpeg(options: ConvertOptions): Promise<LoadedFfmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ffmpeg = new FFmpeg() as LoadedFfmpeg;
  const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
  });

  options.onProgress?.({ phase: "Media engine ready", percent: 14 });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function buildFfmpegArgs(inputName: string, outputName: string, extension: string): string[] {
  if (extension === "mp3") return ["-i", inputName, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", outputName];
  if (extension === "wav") return ["-i", inputName, "-vn", "-codec:a", "pcm_s16le", outputName];
  if (extension === "ogg") return ["-i", inputName, "-vn", "-codec:a", "libvorbis", outputName];
  if (extension === "webm") return ["-i", inputName, "-c:v", "libvpx-vp9", "-c:a", "libopus", outputName];
  return ["-i", inputName, "-c:v", "libx264", "-c:a", "aac", "-movflags", "faststart", outputName];
}

function jsonToCsv(value: unknown): string {
  const rows = Array.isArray(value) ? value : [value];
  if (!rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    throw new Error("JSON to CSV requires an object or an array of objects.");
  }

  const objects = rows as Record<string, unknown>[];
  const headers = Array.from(new Set(objects.flatMap((row) => Object.keys(row))));
  const lines = [headers.map(csvEscape).join(",")];

  for (const row of objects) {
    lines.push(headers.map((header) => csvEscape(formatCsvValue(row[header]))).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function csvToJson(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  const headers = rows.shift();
  if (!headers?.length) throw new Error("CSV file does not contain a header row.");

  return rows.map((row) =>
    headers.reduce<Record<string, string>>((result, header, index) => {
      result[header.trim() || `column_${index + 1}`] = row[index] ?? "";
      return result;
    }, {}),
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function getExtension(fileName: string): string {
  return fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "converted";
}

function withExtension(fileName: string, extension: string, targetId: string): string {
  const base = stripExtension(fileName);
  const suffix = targetId.includes("-") ? `-${targetId.replace(/^json-/, "")}` : "";
  return `${base}${suffix}.${extension}`;
}
