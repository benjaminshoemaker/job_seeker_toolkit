import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Parse sentences with citations: returns validated list and reconstructed paragraphs
function parseAndValidateCitations(
  text: string,
  rMax: number,
  jMax: number
): { paragraphs: Sentence[][]; warnings: string[] } {
  const warnings: string[] = [];
  const paragraphs: Sentence[][] = [];
  if (!text.trim()) return { paragraphs, warnings };

  const paraBlocks = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  // claim (citations) with optional trailing punctuation after citations
  const sentenceRegex = /(.*?)(?:\s*\(([^)]*)\)\s*[.!?]?)\s*(?=\s|$)/g;

  for (const block of paraBlocks) {
    const group: Sentence[] = [];
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(block)) !== null) {
      const claim = match[1].trim();
      const tag = (match[2] || "").trim();
      const citation: Citation = { r: [], j: [] };

      // Extract R# and J# indices
      const rMatch = /R#:\s*([0-9,\s]+)/i.exec(tag);
      const jMatch = /J#:\s*([0-9,\s]+)/i.exec(tag);
      if (rMatch) {
        citation.r = rMatch[1]
          .split(/[,\s]+/)
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= rMax);
      }
      if (jMatch) {
        citation.j = jMatch[1]
          .split(/[,\s]+/)
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= jMax);
      }

      const valid = (citation.r.length + citation.j.length) >= 1;
      if (claim && valid) {
        group.push({ claim, citation });
      }
    }
    if (group.length) paragraphs.push(group);
  }

  if (!paragraphs.length) {
    warnings.push("No valid sentences with citations were found.");
  }

  return { paragraphs, warnings };
}

type ResumeMode = 'choice' | 'upload' | 'paste' | 'editor';

export default function CoverLetterPage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
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

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/")}> 
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Cover Letter Generator</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Textarea
                value={jd}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > MAX_INPUT) {
                    toast.error("JD exceeds 10k characters.");
                    return;
                  }
                  setJd(val);
                }}
                rows={10}
                placeholder="Paste the job description..."
              />
              <div className="text-xs text-muted-foreground mt-1">{jd.length}/{MAX_INPUT}</div>
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
