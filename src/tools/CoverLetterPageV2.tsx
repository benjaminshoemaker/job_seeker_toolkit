import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";

// Optional Figma-driven UI loader using Vite's import.meta.glob.
// This avoids hard-importing a file that may not exist yet, which breaks dev server.
const figmaCandidates = import.meta.glob("../components/CoverLetterGenerator.{tsx,jsx,ts,js}");
const figmaLoader = (Object.values(figmaCandidates)[0] as undefined | (() => Promise<any>));
const FigmaCoverLetter = figmaLoader
  ? lazy(async () => {
      const mod = await figmaLoader();
      return { default: (mod.default || mod.CoverLetterGenerator) as React.ComponentType<any> };
    })
  : null;

const MAX_INPUT = 10_000;
const MODEL_TIMEOUT_MS = 20_000;

function ensureThreeParagraphs(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  let paras = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 3) return paras.join("\n\n");
  const allText = paras.length ? paras.join(" ") : trimmed.replace(/\n+/g, " ");
  const words = allText.split(/\s+/);
  const per = Math.ceil(words.length / 3);
  const p1 = words.slice(0, per).join(" ");
  const p2 = words.slice(per, per * 2).join(" ");
  const p3 = words.slice(per * 2).join(" ");
  return [p1, p2, p3].filter((p) => p.trim().length).join("\n\n");
}

type ResumeMode = 'choice' | 'upload' | 'paste' | 'editor';
type JdMode = 'choice' | 'url' | 'editor';

export default function CoverLetterPageV2() {
  // Core state reused from v1 so backend wiring remains consistent
  const [resume, setResume] = useState("");
  const [extracted, setExtracted] = useState("");
  const [edited, setEdited] = useState(false);
  const [mode, setMode] = useState<ResumeMode>('choice');
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [jd, setJd] = useState("");
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
  const headerRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const debugLayout = useMemo(() => {
    const u = new URL(window.location.href);
    return u.searchParams.get("debug") === "layout";
  }, []);
  const [metrics, setMetrics] = useState<{ vw: number; headerW: number; mainW: number; gridColGap: number; gridRowGap: number } | null>(null);
  useEffect(() => {
    if (!debugLayout) return;
    const calc = () => {
      const vw = Math.round(window.innerWidth);
      const headerW = Math.round(headerRef.current?.getBoundingClientRect()?.width || 0);
      const mainW = Math.round(mainRef.current?.getBoundingClientRect()?.width || 0);
      let gridColGap = 0; let gridRowGap = 0;
      if (gridRef.current) {
        const cs = getComputedStyle(gridRef.current);
        gridColGap = Math.round(parseFloat(cs.columnGap || cs.gap || '0'));
        gridRowGap = Math.round(parseFloat(cs.rowGap || cs.gap || '0'));
      }
      setMetrics({ vw, headerW, mainW, gridColGap, gridRowGap });
    };
    calc();
    window.addEventListener('resize', calc);
    const id = window.setInterval(calc, 500);
    return () => { window.removeEventListener('resize', calc); window.clearInterval(id); };
  }, [debugLayout]);

  // For quick latency testing parity with v1
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
      toast.error("Please provide Resume text and JD.");
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

  // Upload handling (PDF/DOCX)
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
      if (warnings.length) warnings.forEach((w) => toast.message(w));
      if (text.length < 300) toast.message('The extracted text looks quite short. Please review and edit.');
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
    if (val.length > MAX_INPUT) { toast.error("Resume exceeds 10k characters."); return; }
    setResume(val);
    setEdited(val !== extracted);
  }, [extracted]);

  const onJdChange = useCallback((val: string) => {
    if (val.length > MAX_INPUT) { toast.error("JD exceeds 10k characters."); return; }
    setJd(val);
    setJdEdited(val !== jdExtracted);
  }, [jdExtracted]);

  const importJdFromUrl = useCallback(async () => {
    const url = jdUrl.trim();
    if (!url) { toast.error('Enter a URL.'); return; }
    if (jdEdited && !confirm('Replace the current JD text with the imported content?')) return;
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

  // Props passed to the optional Figma component (it may ignore some)
  const figmaProps = {
    // State values
    resume,
    jd,
    output: letter,
    loading,
    // Callbacks
    onGenerate,
    onCopy,
    onResumeChange,
    onJdChange,
    onFileSelected,
    onDrop,
    onResetToExtracted,
    importJdFromUrl,
    onClearJd,
    // UI state controls (if used by Figma component)
    mode,
    setMode,
    fileMeta,
    replaceInputRef,
    extracted,
    edited,
    jdMode,
    setJdMode,
    jdUrl,
    setJdUrl,
    jdImporting,
    jdError,
    jdBannerHost,
    MAX_INPUT,
    onBack: () => (window.location.href = "/"),
  } as any;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      {/* Removed duplicate header to avoid duplication with embedded component/header */}

      {/* Preferred: render Figma UI if present */}
      <main ref={mainRef} className="max-w-7xl mx-auto px-4 py-6">
        {FigmaCoverLetter && (
          <Suspense fallback={null}>
            <FigmaCoverLetter {...figmaProps} />
          </Suspense>
        )}
      </main>
      {debugLayout && (
        <div className="fixed bottom-4 right-4 z-50 bg-card text-foreground border shadow-sm rounded-md px-3 py-2 text-xs">
          <div className="font-medium mb-1">Layout Metrics</div>
          <div>Viewport: {metrics?.vw ?? 0}px</div>
          <div>Header: {metrics?.headerW ?? 0}px</div>
          <div>Main: {metrics?.mainW ?? 0}px</div>
          <div>Grid gap: {metrics?.gridColGap ?? 0}px col / {metrics?.gridRowGap ?? 0}px row</div>
          <div className="mt-1 text-muted-foreground">Add ?debug=layout to toggle</div>
        </div>
      )}
    </div>
  );
}
