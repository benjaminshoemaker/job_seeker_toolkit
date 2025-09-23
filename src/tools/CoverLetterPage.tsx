import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";
import { Loader2, Clipboard, ArrowLeft, FileText, Upload, List as ListIcon, File as FileIcon } from "lucide-react";
import { Input } from "../components/ui/input";

const MAX_INPUT = 10_000;
const MODEL_TIMEOUT_MS = 20_000;

// Ensure exactly three paragraphs; balance by words
function ensureThreeParagraphs(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  let paras = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 3) return paras.join("\n\n");

  // Combine to a single text and split by words into 3 chunks
  const allText = paras.length ? paras.join(" ") : trimmed.replace(/\n+/g, " ");
  const words = allText.split(/\s+/);
  const per = Math.ceil(words.length / 3);
  const p1 = words.slice(0, per).join(" ");
  const p2 = words.slice(per, per * 2).join(" ");
  const p3 = words.slice(per * 2).join(" ");
  return [p1, p2, p3].filter((p) => p.trim().length).join("\n\n");
}

// No mock provider in production; tests can mock fetch('/api/cover-letter/generate')

// (removed unused citation parsing helper)

type ResumeMode = 'choice' | 'upload' | 'paste' | 'editor';

export default function CoverLetterPage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  type JdMode = 'choice' | 'url' | 'editor';
  const [jdMode, setJdMode] = useState<JdMode>('choice');
  const [jdExtracted, setJdExtracted] = useState("");
  const [jdEdited, setJdEdited] = useState(false);
  const [jdBannerHost, setJdBannerHost] = useState<string | null>(null);
  const [jdImporting, setJdImporting] = useState(false);
  const [jdUrl, setJdUrl] = useState("");
  const [jdError, setJdError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<ResumeMode>('choice');
  const [extracted, setExtracted] = useState("");
  const [edited, setEdited] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Optional latency test: /tools/cover-letter?delay=8000
  const delayParam = useMemo(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("delay");
    const n = p ? parseInt(p, 10) : undefined;
    return Number.isFinite(n) ? n : undefined;
  }, []);

  const onGenerate = useCallback(async () => {
    if (resume.length > MAX_INPUT || jd.length > MAX_INPUT) {
      toast.error("Input too long (max 10k chars each).");
      return;
    }
    if (!resume.trim() || !jd.trim()) {
      toast.error("Please provide Resume text and paste the JD.");
      return;
    }

    setLoading(true);
    setLetter("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const raw = await Promise.race([
        (async () => {
          const res = await fetch('/api/cover-letter/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume, jd }),
            signal: ctrl.signal,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || 'Generation failed');
          return String(data.letter || '');
        })(),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), MODEL_TIMEOUT_MS)),
      ]);
      const normalized = ensureThreeParagraphs(raw.trim());
      if (!normalized) {
        toast.error("The model returned an empty letter. Please try again.");
      }
      setLetter(normalized);
    } catch (e: any) {
      if (e?.message === "timeout") {
        toast.error("Model request timed out. Please retry.");
      } else if (e?.name !== "AbortError") {
        const msg = typeof e?.message === 'string' && e.message ? e.message : 'Failed to generate. Please try again.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [resume, jd, delayParam]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letter);
      toast.success("Letter copied to clipboard.");
    } catch {
      toast.error("Copy failed. Select and copy manually.");
    }
  }, [letter]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Upload handling
  const onFileSelected = useCallback(async (file: File | null) => {
    if (!file) return;
    setFileMeta({ name: file.name, size: file.size });
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error('Unsupported file type. Only PDF and DOCX are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5 MB).');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/extract-resume', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Extraction failed');
      const text = String(data?.text || '');
      const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
      if (warnings.length) {
        for (const w of warnings) toast.message(w);
      }
      if (text.length < 300) {
        toast.message('The extracted text looks quite short. Please review and edit.');
      }
      setExtracted(text);
      setResume(text);
      setEdited(false);
      setMode('editor');
    } catch (e: any) {
      const msg = String(e?.message || 'Extraction failed');
      toast.error(msg);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    onFileSelected(file || null);
  }, [onFileSelected]);

  const onResetToExtracted = useCallback(() => {
    setResume(extracted);
    setEdited(false);
  }, [extracted]);

  const onResumeChange = useCallback((val: string) => {
    if (val.length > MAX_INPUT) {
      toast.error("Resume exceeds 10k characters.");
      return;
    }
    setResume(val);
    setEdited(val !== extracted);
  }, [extracted]);

  

  // JD helpers
  const onJdChange = useCallback((val: string) => {
    if (val.length > MAX_INPUT) {
      toast.error("JD exceeds 10k characters.");
      return;
    }
    setJd(val);
    setJdEdited(val !== jdExtracted);
  }, [jdExtracted]);

  const importJdFromUrl = useCallback(async () => {
    const url = jdUrl.trim();
    if (!url) { toast.error('Enter a URL.'); return; }
    // Confirm replacement if edited
    if (jdEdited && !confirm('Replace the current JD text with the imported content?')) {
      return;
    }
    setJdImporting(true);
    setJdError(null);
    try {
      const res = await fetch('/api/jd-from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Import failed');
      const text = String(data?.text || '');
      const host = String(data?.host || '');
      setJd(text);
      setJdExtracted(text);
      setJdEdited(false);
      setJdBannerHost(host || null);
      setJdMode('editor');
    } catch (e: any) {
      const msg = 'We couldn’t import this page. Paste the job description text instead.';
      toast.error(msg);
      setJdError(msg);
    } finally {
      setJdImporting(false);
    }
  }, [jdUrl, jdEdited]);

  const onClearJd = useCallback(() => {
    if (!jd.trim() || confirm('Clear the JD editor?')) {
      setJd('');
      setJdEdited(false);
      setJdExtracted('');
      setJdBannerHost(null);
      setJdMode('choice');
    }
  }, [jd]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/")}> 
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Cover Letter Generator</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resume choice / upload / paste / editor */}
            {mode === 'choice' && (
              <div>
                <label className="block text-sm font-medium mb-2">Resume</label>
                <div className="text-xs text-muted-foreground mb-3">Choose how to provide your resume.</div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode('upload')}
                    className="flex-1 h-10"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload (PDF/DOCX)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMode('paste')}
                    className="flex-1 h-10"
                  >
                    <ListIcon className="w-4 h-4 mr-2" /> Paste text
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Upload is recommended for most resumes. Use paste if your resume is image-only.</div>
              </div>
            )}

            {mode === 'upload' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Upload Resume</label>
                  <Button variant="ghost" size="sm" onClick={() => setMode('choice')}>
                    <ArrowLeft className="w-3 h-3 mr-1" /> Back
                  </Button>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload resume (PDF/DOCX)"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={onDrop}
                  className="border-2 border-dashed rounded-md p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:border-primary/50"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <div className="text-sm">Drag and drop your resume here</div>
                    <div className="text-xs text-muted-foreground">PDF or DOCX, up to 5 MB</div>
                    <div className="mt-2">
                      <Button size="sm" asChild>
                        <label className="cursor-pointer">
                          Choose file
                          <Input 
                            type="file" 
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                            onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                            className="sr-only"
                          />
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">After upload, you can edit the extracted text.</div>
              </div>
            )}

            {mode === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Paste Resume Text</label>
                  <Button variant="ghost" size="sm" onClick={() => setMode('choice')}>
                    <ArrowLeft className="w-3 h-3 mr-1" /> Back
                  </Button>
                </div>
                <Textarea
                  value={resume}
                  onChange={(e) => onResumeChange(e.target.value)}
                  rows={10}
                  placeholder="Paste your resume bullets or text..."
                />
                <div className="text-xs text-muted-foreground">{resume.length}/{MAX_INPUT}</div>
                <div className="flex items-center justify-end">
                  <Button size="sm" onClick={() => { setExtracted(resume); setEdited(false); setMode('editor'); }} disabled={!resume.trim()}>Continue</Button>
                </div>
              </div>
            )}

            {mode === 'editor' && (
              <div className="space-y-2">
                {fileMeta && (
                  <div className="flex items-center justify-between text-sm border rounded-md p-2">
                    <div className="flex items-center gap-2"><FileIcon className="w-4 h-4" /> {fileMeta.name} <span className="text-muted-foreground">({Math.ceil(fileMeta.size/1024)} KB)</span></div>
                    <div>
                      <input
                        ref={replaceInputRef}
                        type="file"
                        className="sr-only"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        aria-label="Replace uploaded resume file"
                        onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => replaceInputRef.current?.click()}>Replace</Button>
                    </div>
                  </div>
                )}
                <label className="block text-sm font-medium">Resume Text Editor</label>
                <Textarea
                  value={resume}
                  onChange={(e) => onResumeChange(e.target.value)}
                  rows={10}
                  placeholder="Edit your resume text..."
                />
                <div className="text-xs text-muted-foreground mt-1">{resume.length}/{MAX_INPUT}</div>
                <div className="flex items-center gap-3">
                  {edited && <Button variant="outline" size="sm" onClick={onResetToExtracted}>Reset to extracted</Button>}
                  <button className="underline text-xs" onClick={() => setMode(extracted ? 'upload' : 'paste')}>{extracted ? 'Switch to upload' : 'Switch to paste'}</button>
                </div>
                <div className="text-xs text-muted-foreground">Edit your resume text here. Keep bullets short; avoid tables for best results.</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Job Description (JD)</label>
              {jdMode === 'choice' && (
                <div>
                  <div className="text-xs text-muted-foreground mb-3">Choose how to provide the job description.</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      className="rounded-md border p-4 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setJdMode('url')}
                      aria-label="Import from URL"
                    >
                      <div className="font-medium">Import from URL</div>
                      <div className="text-xs text-muted-foreground mt-1">Paste a public job post URL. You can edit the imported text.</div>
                    </button>
                    <button
                      className="rounded-md border p-4 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => { setJdMode('editor'); setJdBannerHost(null); setJdExtracted(jd); setJdEdited(false); }}
                      aria-label="Paste job description text"
                    >
                      <div className="font-medium">Paste job description text</div>
                      <div className="text-xs text-muted-foreground mt-1">Paste the JD and edit directly.</div>
                    </button>
                  </div>
                </div>
              )}

              {jdMode === 'url' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      className="border rounded-md px-3 py-2 w-full text-sm bg-input-background"
                      placeholder="https://example.com/jobs/..."
                      value={jdUrl}
                      onChange={(e) => setJdUrl(e.target.value)}
                      disabled={jdImporting}
                      aria-label="Job post URL"
                    />
                    <Button size="sm" onClick={importJdFromUrl} disabled={jdImporting}>{jdImporting ? 'Importing…' : 'Import'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setJdMode('choice')}>Back</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Paste a public job post URL. You can edit the imported text.</div>
                  {jdImporting && (
                    <div className="text-xs text-muted-foreground">Fetching and extracting content…</div>
                  )}
                  {jdError && (
                    <div className="text-xs text-destructive" aria-live="polite">{jdError}</div>
                  )}
                </div>
              )}

              {jdMode === 'editor' && (
                <div className="space-y-2">
                  {/* Back button only for paste path (no banner host) */}
                  {!jdBannerHost && (
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setJdMode('choice')}>
                        <ArrowLeft className="w-3 h-3 mr-1" /> Back
                      </Button>
                    </div>
                  )}
                  {jdBannerHost && (
                    <div className="text-xs bg-muted rounded p-2">Imported from {jdBannerHost}. Review and edit before generating.</div>
                  )}
                  <Textarea
                    value={jd}
                    onChange={(e) => onJdChange(e.target.value)}
                    rows={10}
                    placeholder="Paste the job description..."
                  />
                  <div className="text-xs text-muted-foreground mt-1">{jd.length}/{MAX_INPUT}</div>
                  {/* Actions only when content came from import */}
                  {jdBannerHost && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setJdMode('url')}>Replace with new import</Button>
                      <Button variant="ghost" size="sm" onClick={onClearJd}>Clear editor</Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            

            <div className="flex items-center gap-3">
              <Button onClick={onGenerate} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Output Letter</CardTitle>
            <Button variant="outline" size="sm" onClick={onCopy} disabled={!letter}>
              <Clipboard className="w-4 h-4 mr-1" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea value={letter} readOnly rows={18} placeholder="Generated letter will appear here..." />
            <div className="text-xs text-muted-foreground mt-2">Paragraph breaks are preserved.</div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
