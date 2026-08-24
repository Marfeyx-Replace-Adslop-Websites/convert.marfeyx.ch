import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  convertFile,
  formatBytes,
  getFileCategory,
  getTargetsForFile,
  type ConversionResult,
} from "./converter";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const targets = useMemo(() => getTargetsForFile(file), [file]);
  const selectedTarget = targets.find((target) => target.id === targetId) ?? targets[0] ?? null;
  const category = file ? getFileCategory(file) : null;

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    if (!targets.length) {
      setTargetId("");
      return;
    }

    if (!targets.some((target) => target.id === targetId)) {
      setTargetId(targets[0].id);
    }
  }, [targetId, targets]);

  function handleChooseClick() {
    setError("");

    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    clearResult();
    setFile(selected);
    setStatus("");
    setError("");
    event.target.value = "";
  }

  async function handleConvert() {
    if (!file || !selectedTarget) return;

    clearResult();
    setIsConverting(true);
    setError("");
    setProgress(0);
    setStatus("Starting conversion");

    try {
      const converted = await convertFile(file, selectedTarget, {
        onProgress: ({ phase, percent }) => {
          setStatus(phase);
          setProgress(percent ?? null);
        },
      });
      const url = URL.createObjectURL(converted.blob);
      setResult(converted);
      setDownloadUrl(url);
      setProgress(100);
      setStatus(converted.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This conversion is not supported locally yet.");
      setStatus("");
      setProgress(null);
    } finally {
      setIsConverting(false);
    }
  }

  function clearResult() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl("");
    setResult(null);
  }

  function clearAll() {
    clearResult();
    setFile(null);
    setTargetId("");
    setStatus("");
    setProgress(null);
    setError("");
  }

  return (
    <>
      <main className="app-shell">
        <section className="control-panel" aria-label="File conversion controls">
          <header>
            <p className="eyebrow">Local-only converter</p>
            <h1>All Types File Converter</h1>
          </header>

          <input ref={fileInputRef} className="hidden-file-input" type="file" onChange={handleFileChange} />
          <button className="file-drop" type="button" onClick={handleChooseClick} disabled={isConverting}>
            <span className="file-icon" aria-hidden="true">
              +
            </span>
            <span>{file ? "Choose another file" : "Choose a file"}</span>
            <small>No file content leaves this browser.</small>
          </button>

          <div className="privacy-note">
            <strong>No files are saved.</strong>
            <span>File reads, conversions, and downloads happen in this tab.</span>
          </div>

          {file ? (
            <>
              <div className="file-card">
                <span>{categoryLabel(category)}</span>
                <strong>{file.name}</strong>
                <small>
                  {formatBytes(file.size)} · {file.type || "unknown type"}
                </small>
              </div>

              <label className="field">
                <span>Output format</span>
                <select value={selectedTarget?.id ?? ""} onChange={(event) => setTargetId(event.target.value)}>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedTarget ? <p className="target-note">{selectedTarget.description}</p> : null}

              <button
                className="primary-action"
                type="button"
                onClick={handleConvert}
                disabled={isConverting || !selectedTarget}
              >
                {isConverting ? "Converting..." : "Convert locally"}
              </button>
              <button className="secondary-action" type="button" onClick={clearAll} disabled={isConverting}>
                Clear
              </button>
            </>
          ) : null}

          {error ? <p className="error-message">{error}</p> : null}

          <footer className="site-footer">
            <div className="footer-links">
              <a href="privacy.html">Privacy Policy</a>
              <a href="mailto:contact.marfeyx@gmail.com">Report issues</a>
            </div>
          </footer>
        </section>

        <section className="workspace" aria-label="Conversion workspace">
          <div className="converter-surface">
            <div className="surface-header">
              <div>
                <p className="eyebrow">Browser memory only</p>
                <h2>{file ? "Ready to convert" : "Select a file to start"}</h2>
              </div>
              <span className="status-pill active">Local</span>
            </div>

            <div className="flow-diagram" aria-hidden="true">
              <div className="flow-node">
                <span>1</span>
                <strong>Pick file</strong>
              </div>
              <div className="flow-line" />
              <div className="flow-node">
                <span>2</span>
                <strong>Convert</strong>
              </div>
              <div className="flow-line" />
              <div className="flow-node">
                <span>3</span>
                <strong>Download</strong>
              </div>
            </div>

            <div className="status-panel">
              <div className="status-copy">
                <span>Status</span>
                <strong>{status || (file ? "Waiting for conversion" : "No file selected")}</strong>
              </div>
              <div className="meter-track" aria-hidden="true">
                <span style={{ width: `${progress ?? 0}%` }} />
              </div>
            </div>

            {result && downloadUrl ? (
              <div className="result-panel">
                <div>
                  <span>Converted file</span>
                  <strong>{result.fileName}</strong>
                  <small>{formatBytes(result.blob.size)}</small>
                </div>
                <a className="download-button" href={downloadUrl} download={result.fileName}>
                  Download
                </a>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-mark" aria-hidden="true">
                  file
                </div>
                <h2>Conversion queue is empty</h2>
                <p>Select a file, choose an output format, then download the result from this page.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="details-panel" aria-label="Supported conversions">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Supported locally</p>
              <h2>Common conversions</h2>
            </div>
          </div>
          <div className="support-list">
            <SupportItem title="Images" text="PNG, JPEG, WebP, and browser-decodable image inputs through canvas." />
            <SupportItem title="Media" text="MP4, WebM, MP3, WAV, and Ogg through FFmpeg.wasm when the browser supports it." />
            <SupportItem title="Data" text="Pretty/minified JSON, JSON to CSV, CSV to JSON, and simple HTML/text exports." />
            <SupportItem title="ZIP" text="Package a file into ZIP or extract an uploaded ZIP into a cleaned local ZIP bundle." />
          </div>
        </aside>
      </main>
    </>
  );
}

function SupportItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="support-item">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function categoryLabel(category: ReturnType<typeof getFileCategory> | null): string {
  if (!category) return "Unknown";
  return category === "media" ? "Audio or video" : `${category[0].toUpperCase()}${category.slice(1)}`;
}













export default App;
