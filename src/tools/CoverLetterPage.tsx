import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";
import { Loader2, Clipboard, ArrowLeft, FileText } from "lucide-react";

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

export default function CoverLetterPage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState("");
  const abortRef = useRef<AbortController | null>(null);

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
      toast.error("Please paste both Resume and JD.");
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
            <div>
              <label className="block text-sm font-medium mb-2">Resume (paste only)</label>
              <Textarea
                value={resume}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > MAX_INPUT) {
                    toast.error("Resume exceeds 10k characters.");
                    return;
                  }
                  setResume(val);
                }}
                rows={10}
                placeholder="Paste your resume bullets or text..."
              />
              <div className="text-xs text-muted-foreground mt-1">{resume.length}/{MAX_INPUT}</div>
            </div>

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
