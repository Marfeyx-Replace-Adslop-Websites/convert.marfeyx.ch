import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Accordion,
  Button,
  Card,
  Chip,
  Description,
  Label,
  Link,
  ListBox,
  Modal,
  ProgressBar,
  Select,
  Separator,
  Spinner,
  Tabs,
  Tooltip,
} from "@heroui/react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  FolderOpen,
  HardDrive,
  Info,
  Layers2,
  LockKeyhole,
  Monitor,
  Music2,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BlurFade, BorderBeam, DotPattern, MagicCard } from "./components/motion-details";
import {
  allTargets,
  convertFile,
  formatBytes,
  getExtension,
  getFileCategory,
  getTargetsForFile,
  type ConversionResult,
} from "./converter";

const groups = [
  {
    id: "image",
    title: "Images",
    icon: FileImage,
    formats: "PNG · JPEG · WebP",
    description:
      "Convert browser-decodable images to PNG, JPEG, or WebP. Image support depends on your browser.",
    color: "violet",
  },
  {
    id: "media",
    title: "Audio & video",
    icon: Music2,
    formats: "MP4 · WebM · MP3",
    description:
      "Convert MP4, WebM, MP3, WAV, and Ogg with FFmpeg.wasm. The engine loads on first use; large files can take time.",
    color: "rose",
  },
  {
    id: "data",
    title: "Data",
    icon: FileCode2,
    formats: "JSON · CSV",
    description: "Format or minify JSON, convert JSON objects to CSV, or turn CSV rows into JSON.",
    color: "amber",
  },
  {
    id: "text",
    title: "Documents",
    icon: FileText,
    formats: "TXT · HTML",
    description:
      "Export readable text as plain text or a simple HTML document. This is not a PDF or Office document converter.",
    color: "blue",
  },
  {
    id: "archive",
    title: "Archives",
    icon: FileArchive,
    formats: "ZIP",
    description: "Package a file into ZIP, or extract an existing ZIP into a cleaned ZIP bundle.",
    color: "sage",
  },
] as const;

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [guide, setGuide] = useState(false);
  const [guideTab, setGuideTab] = useState("image");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const convertingRef = useRef(false);
  const dragDepth = useRef(0);
  const targets = useMemo(() => getTargetsForFile(file), [file]);
  const selectedTarget = targets.find((target) => target.id === targetId) ?? targets[0] ?? null;
  const category = file ? getFileCategory(file) : null;
  const fileGroup = groups.find((group) => group.id === category);
  const FileIcon = fileGroup?.icon ?? File;
  const step = result ? 3 : file ? 2 : 1;

  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );
  useEffect(() => {
    if (!targets.length) setTargetId("");
    else if (!targets.some((target) => target.id === targetId)) setTargetId(targets[0].id);
  }, [targetId, targets]);

  function clearResult() {
    setDownloadUrl("");
    setResult(null);
  }
  function chooseFile(selected: File) {
    if (convertingRef.current) return;
    clearResult();
    setFile(selected);
    setStatus("");
    setError("");
    setProgress(null);
  }
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) chooseFile(selected);
    event.target.value = "";
  }
  function openPicker() {
    if (!convertingRef.current) fileInputRef.current?.click();
  }
  function clearAll() {
    if (convertingRef.current) return;
    clearResult();
    setFile(null);
    setTargetId("");
    setStatus("");
    setProgress(null);
    setError("");
  }
  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (convertingRef.current) return;
    if (event.dataTransfer.files.length > 1) {
      setError("Choose one file at a time.");
      return;
    }
    const dropped = event.dataTransfer.files[0];
    if (dropped) chooseFile(dropped);
  }
  async function handleConvert() {
    if (!file || !selectedTarget || convertingRef.current) return;
    convertingRef.current = true;
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
      setResult(converted);
      setDownloadUrl(URL.createObjectURL(converted.blob));
      setProgress(100);
      setStatus(converted.message);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "This conversion is not supported locally yet.",
      );
      setStatus("");
      setProgress(null);
    } finally {
      convertingRef.current = false;
      setIsConverting(false);
    }
  }
  function openGuide(tab = "image") {
    setGuideTab(tab);
    setGuide(true);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#converter">
        Skip to converter
      </a>
      <aside className="sidebar">
        <a className="brand" href="./" aria-label="Marfeyx Convert home">
          <span className="brand-mark">
            <Layers2 size={23} strokeWidth={1.6} />
          </span>
          <span>
            marfeyx<span className="brand-sub">CONVERT</span>
          </span>
        </a>
        <div className="nav-group-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="main-nav">
          <a className="nav-item selected" href="#converter" aria-current="page">
            <RefreshCw size={17} />
            File converter
            <span className="nav-dot" />
          </a>
          <Button variant="ghost" className="nav-item" onPress={() => openGuide()}>
            <Layers2 size={17} />
            Format guide
            <ArrowUpRight size={14} className="nav-end" />
          </Button>
        </nav>
        <Separator className="side-separator" />
        <div className="nav-group-label">FILE TYPES</div>
        <nav aria-label="File types" className="type-nav">
          {groups.map((group) => (
            <Button
              variant="ghost"
              key={group.id}
              className="nav-item"
              onPress={() => openGuide(group.id)}
            >
              <group.icon size={16} />
              {group.title}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <MagicCard className="local-card">
            <span className="local-card-icon">
              <ShieldCheck size={20} strokeWidth={1.5} />
            </span>
            <h2>On your device.</h2>
            <p>Files are processed in this browser, not uploaded to a server.</p>
            <Link href="privacy.html">
              Privacy policy
              <ArrowUpRight size={13} />
            </Link>
          </MagicCard>
          <a className="support-link" href="mailto:contact.marfeyx@gmail.com">
            <CircleHelp size={16} />
            Help & feedback
            <ArrowUpRight size={13} />
          </a>
          <div className="sidebar-caption">A MARFEYX UTILITY</div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="mobile-brand">
              <Layers2 size={18} />
              marfeyx
            </span>
            <span className="desktop-crumb">Workspace</span>
            <ChevronRight size={13} />
            <span>File converter</span>
          </div>
          <div className="topbar-actions">
            <Chip className="local-chip" size="sm" variant="soft">
              <span className="live-dot" />
              Local processing
            </Chip>
            <Tooltip>
              <Button
                variant="ghost"
                isIconOnly
                aria-label="About local processing"
                onPress={() => openGuide()}
              >
                <Info size={17} />
              </Button>
              <Tooltip.Content>Files stay in your browser. View supported formats.</Tooltip.Content>
            </Tooltip>
          </div>
        </header>

        <main id="converter" className="workspace">
          <BlurFade>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span />
                  FILE TOOLS
                </div>
                <h1>
                  Convert files<span>. Keep control.</span>
                </h1>
                <p>Private, on-device conversion for the files you use every day.</p>
              </div>
              <Button variant="outline" className="guide-button" onPress={() => openGuide()}>
                <Layers2 size={16} />
                Supported formats
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </BlurFade>

          <BlurFade delay={0.06}>
            <div className="conversion-grid">
              <Card className="upload-card">
                <Card.Header className="panel-header">
                  <div className="panel-title">
                    <span className="step-label">01</span>
                    <Card.Title>Your file</Card.Title>
                  </div>
                  <Chip size="sm" variant="soft" className="neutral-chip">
                    Single file
                  </Chip>
                </Card.Header>
                <Card.Content>
                  <input
                    ref={fileInputRef}
                    className="hidden-file-input"
                    aria-label="Choose a file"
                    type="file"
                    disabled={isConverting}
                    onChange={handleFileChange}
                  />
                  <div
                    className={
                      "dropzone " + (dragging ? "is-dragging " : "") + (file ? "has-file" : "")
                    }
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (!isConverting) {
                        dragDepth.current++;
                        setDragging(true);
                      }
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      dragDepth.current = Math.max(0, dragDepth.current - 1);
                      if (!dragDepth.current) setDragging(false);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = isConverting ? "none" : "copy";
                    }}
                    onDrop={dropFile}
                  >
                    <DotPattern />
                    {(dragging || isConverting) && <BorderBeam />}
                    <div className="drop-content">
                      {file ? (
                        <BlurFade key={file.name}>
                          <div className={"selected-file-icon " + (fileGroup?.color ?? "violet")}>
                            <FileIcon size={39} strokeWidth={1.2} />
                            <span>
                              {getExtension(file.name).slice(0, 8).toUpperCase() || "FILE"}
                            </span>
                          </div>
                          <h2 className="selected-file-name" title={file.name}>
                            {file.name}
                          </h2>
                          <p>
                            {formatBytes(file.size)}
                            <span className="dot-separator">·</span>
                            {fileGroup?.title ?? "File"}
                          </p>
                        </BlurFade>
                      ) : (
                        <>
                          <div className="file-illustration" aria-hidden="true">
                            <span className="paper paper-back">
                              <FileImage size={25} strokeWidth={1.2} />
                            </span>
                            <span className="paper paper-front">
                              <FileText size={29} strokeWidth={1.2} />
                              <i />
                              <i />
                            </span>
                            <span className="paper-badge">
                              <Plus size={17} />
                            </span>
                          </div>
                          <h2>{dragging ? "Drop your file here" : "Drop a file to get started"}</h2>
                          <p>or choose a file from your device</p>
                        </>
                      )}
                      <Button
                        className="browse-button"
                        variant={file ? "outline" : "primary"}
                        onPress={openPicker}
                        isDisabled={isConverting}
                      >
                        <FolderOpen size={16} />
                        {file ? "Choose another file" : "Browse files"}
                        {!file && <ArrowRight size={15} />}
                      </Button>
                      {!file && (
                        <span className="drop-caption">Images, audio, video, text, data & ZIP</span>
                      )}
                    </div>
                  </div>
                </Card.Content>
                <Card.Footer className="upload-footer">
                  <LockKeyhole size={13} />
                  <span>Your files stay on this device.</span>
                  <Tooltip>
                    <Button
                      variant="ghost"
                      isIconOnly
                      className="tiny-button"
                      aria-label="File privacy details"
                      onPress={() => openGuide()}
                    >
                      <Info size={14} />
                    </Button>
                    <Tooltip.Content>
                      Conversion runs in browser memory. Media tools may load from a CDN.
                    </Tooltip.Content>
                  </Tooltip>
                </Card.Footer>
              </Card>

              <Card className="settings-card">
                <Card.Header className="panel-header">
                  <div className="panel-title">
                    <span className="step-label">02</span>
                    <Card.Title>Output settings</Card.Title>
                  </div>
                  <SlidersHorizontal size={17} className="muted" />
                </Card.Header>
                <Card.Content className="settings-content">
                  <Select
                    className="format-select"
                    value={selectedTarget?.id ?? null}
                    onChange={(value) => {
                      setTargetId(String(value ?? ""));
                      clearResult();
                      setStatus("");
                      setProgress(null);
                      setError("");
                    }}
                    isDisabled={!file || isConverting}
                    placeholder="Select a format"
                    fullWidth
                  >
                    <Label>Convert to</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Description>
                      {selectedTarget?.description ??
                        "Choose a file to see available output formats."}
                    </Description>
                    <Select.Popover>
                      <ListBox aria-label="Output formats">
                        {targets.map((target) => (
                          <ListBox.Item id={target.id} key={target.id} textValue={target.label}>
                            <Label>{target.label}</Label>
                            <Description>{target.extension.toUpperCase()}</Description>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Separator />
                  <dl className="file-details">
                    <div>
                      <dt>Source format</dt>
                      <dd>{file ? getExtension(file.name).toUpperCase() || "Unknown" : "—"}</dd>
                    </div>
                    <div>
                      <dt>File size</dt>
                      <dd>{file ? formatBytes(file.size) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Processing</dt>
                      <dd>
                        <Monitor size={13} />
                        On-device
                      </dd>
                    </div>
                  </dl>
                  <div className="settings-actions">
                    <Button
                      className="convert-button"
                      fullWidth
                      onPress={handleConvert}
                      isDisabled={!file || !selectedTarget || isConverting}
                      isPending={isConverting}
                    >
                      {isConverting ? <Spinner size="sm" /> : <RefreshCw size={15} />}
                      <span>{isConverting ? "Converting…" : "Convert file"}</span>
                      {!isConverting && <ArrowRight size={15} />}
                    </Button>
                    <Button
                      variant="ghost"
                      className="clear-button"
                      fullWidth
                      onPress={clearAll}
                      isDisabled={!file || isConverting}
                    >
                      <X size={14} />
                      Clear file
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </BlurFade>

          <BlurFade delay={0.12}>
            <Card
              className={"activity-card " + (result ? "is-complete" : "")}
              aria-label="Conversion workspace"
            >
              <Card.Header className="activity-header">
                <div className="panel-title">
                  <span className="step-label">03</span>
                  <Card.Title>Conversion & download</Card.Title>
                </div>
                <ol className="steps" aria-label="Conversion steps">
                  {["Select", "Convert", "Download"].map((label, i) => (
                    <li
                      key={label}
                      className={step >= i + 1 ? "current" : ""}
                      aria-current={step === i + 1 ? "step" : undefined}
                    >
                      <span>{step > i + 1 ? <Check size={10} /> : i + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              </Card.Header>
              <Card.Content>
                {error && (
                  <div className="error-message" role="alert">
                    <Info size={18} />
                    <div>
                      <strong>Conversion could not be completed</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}
                {isConverting ? (
                  <div className="conversion-progress">
                    <div className="progress-heading">
                      <span className="activity-icon processing">
                        <RefreshCw size={21} />
                      </span>
                      <div>
                        <h2>Converting your file</h2>
                        <p role="status">{status}</p>
                      </div>
                    </div>
                    <ProgressBar
                      aria-label="Conversion progress"
                      value={progress ?? 0}
                      isIndeterminate={progress === null}
                    >
                      <ProgressBar.Output />
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                  </div>
                ) : result && downloadUrl ? (
                  <BlurFade>
                    <div className="result-row">
                      <span className="activity-icon success">
                        <CheckCheck size={23} />
                      </span>
                      <div className="result-copy">
                        <span className="result-kicker">READY TO DOWNLOAD</span>
                        <h2 title={result.fileName}>{result.fileName}</h2>
                        <p>
                          {formatBytes(result.blob.size)}
                          <span className="dot-separator">·</span>
                          {result.message}
                        </p>
                      </div>
                      <Link
                        className="download-button"
                        href={downloadUrl}
                        download={result.fileName}
                      >
                        <ArrowDownToLine size={17} />
                        Download file
                      </Link>
                    </div>
                  </BlurFade>
                ) : (
                  <div className="empty-result">
                    <span className="activity-icon">
                      <ArrowDownToLine size={24} strokeWidth={1.3} />
                    </span>
                    <div>
                      <h2>
                        {file ? "Ready when you are" : "Your converted file will appear here"}
                      </h2>
                      <p>
                        {file
                          ? "Choose your output format, then select Convert file."
                          : "Select a file above to begin. No account needed."}
                      </p>
                    </div>
                    <span className="waiting-label">
                      <span />
                      {file ? "Ready to convert" : "Waiting for a file"}
                    </span>
                  </div>
                )}
              </Card.Content>
            </Card>
          </BlurFade>

          <BlurFade delay={0.18}>
            <section className="formats-section" aria-labelledby="formats-heading">
              <div className="section-heading">
                <h2 id="formats-heading">A format for every task</h2>
                <Button variant="ghost" className="text-button" onPress={() => openGuide()}>
                  Explore formats
                  <ArrowRight size={14} />
                </Button>
              </div>
              <div className="format-cards">
                {groups.map((group) => (
                  <MagicCard key={group.id}>
                    <Button
                      variant="ghost"
                      className="format-card"
                      onPress={() => openGuide(group.id)}
                    >
                      <span className={"format-icon " + group.color}>
                        <group.icon size={19} strokeWidth={1.5} />
                      </span>
                      <strong>{group.title}</strong>
                      <span className="format-examples">{group.formats}</span>
                      <ArrowUpRight size={13} className="format-arrow" />
                    </Button>
                  </MagicCard>
                ))}
              </div>
            </section>
          </BlurFade>
          <footer className="workspace-footer">
            <span>
              <HardDrive size={13} />
              Processed locally. Downloaded directly.
            </span>
            <div>
              <a href="privacy.html">Privacy policy</a>
              <a href="mailto:contact.marfeyx@gmail.com">
                Report an issue
                <ArrowUpRight size={12} />
              </a>
            </div>
          </footer>
        </main>
      </div>

      <Modal isOpen={guide} onOpenChange={setGuide}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="guide-dialog">
              <Modal.CloseTrigger aria-label="Close format guide" />
              <Modal.Header>
                <Modal.Icon>
                  <Layers2 size={22} />
                </Modal.Icon>
                <Modal.Heading>Format guide</Modal.Heading>
                <p>Available conversions and how they run.</p>
              </Modal.Header>
              <Modal.Body>
                <Tabs selectedKey={guideTab} onSelectionChange={(key) => setGuideTab(String(key))}>
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Format categories">
                      {groups.map((group) => (
                        <Tabs.Tab id={group.id} key={group.id}>
                          {group.title}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      ))}
                    </Tabs.List>
                  </Tabs.ListContainer>
                  {groups.map((group) => (
                    <Tabs.Panel id={group.id} key={group.id}>
                      <p className="guide-description">{group.description}</p>
                      <div className="guide-formats">
                        {allTargets
                          .filter((target) => target.category === group.id)
                          .map((target) => (
                            <div key={target.id}>
                              <span className={"format-icon " + group.color}>
                                <group.icon size={17} />
                              </span>
                              <div>
                                <strong>{target.label}</strong>
                                <p>{target.description}</p>
                              </div>
                              <Chip size="sm" variant="soft">
                                {target.extension.toUpperCase()}
                              </Chip>
                            </div>
                          ))}
                      </div>
                    </Tabs.Panel>
                  ))}
                </Tabs>
                <Accordion className="guide-faq">
                  <Accordion.Item>
                    <Accordion.Heading>
                      <Accordion.Trigger>
                        Where are my files processed?
                        <Accordion.Indicator />
                      </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                      <Accordion.Body>
                        In this browser tab, using browser APIs, JSZip, or FFmpeg.wasm. File
                        contents are not uploaded. Media conversion may download engine files from a
                        public CDN.
                      </Accordion.Body>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item>
                    <Accordion.Heading>
                      <Accordion.Trigger>
                        What if a conversion is unavailable?
                        <Accordion.Indicator />
                      </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                      <Accordion.Body>
                        Available formats depend on the selected file. Image decoding and media
                        support also depend on your browser. Try another offered format or a smaller
                        file. You can report a problem using the feedback link.
                      </Accordion.Body>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={() => setGuide(false)}>
                  Back to converter
                  <ArrowRight size={15} />
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export default App;
