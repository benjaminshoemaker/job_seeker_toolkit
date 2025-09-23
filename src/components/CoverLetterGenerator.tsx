import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";
import {
  ArrowLeft,
  FileText,
  Upload,
  Copy,
  Loader2,
  Check,
  X,
  Link,
  Edit3,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface CoverLetterGeneratorProps {
  onBack: () => void;
}

type ResumeInputMode = "choose" | "upload" | "paste" | "editor";
type JobDescriptionMode = "choose" | "url" | "paste" | "editor";

interface UploadedFile {
  name: string;
  size: number;
  text: string;
}

export function CoverLetterGenerator({ onBack }: CoverLetterGeneratorProps) {
  // Resume state
  const [resumeMode, setResumeMode] = useState<ResumeInputMode>("choose");
  const [resumeText, setResumeText] = useState("");
  const [originalResumeText, setOriginalResumeText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [pastedResumeText, setPastedResumeText] = useState("");

  // Job description state
  const [jobDescMode, setJobDescMode] = useState<JobDescriptionMode>("choose");
  const [jobDescText, setJobDescText] = useState("");
  const [jobDescUrl, setJobDescUrl] = useState("");
  const [importedFromUrl, setImportedFromUrl] = useState("");
  const [pastedJobDescText, setPastedJobDescText] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHAR_LIMIT = 10000;

  // File upload handling (real backend extraction)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB");
      return;
    }
    const extOk = /\.(pdf|docx)$/i.test(file.name);
    const typeOk = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type);
    if (!extOk && !typeOk) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract-resume", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Extraction failed");
      const text = String(data?.text || "");
      const uploadedFileData: UploadedFile = { name: file.name, size: file.size, text };
      setUploadedFile(uploadedFileData);
      setResumeText(text);
      setOriginalResumeText(text);
      setResumeMode("editor");
      const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
      if (warnings.length) warnings.forEach((w) => toast.message(w));
      if (text.length < 300) {
        toast("The extracted text looks quite short. Please review and edit.");
      } else {
        toast.success("Resume uploaded and text extracted successfully");
      }
    } catch (e: any) {
      const msg = String(e?.message || "Extraction failed");
      toast.error(msg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Resume paste handling
  const handleResumePaste = () => {
    if (pastedResumeText.trim()) {
      setResumeText(pastedResumeText);
      setOriginalResumeText(pastedResumeText);
      setResumeMode("editor");
      toast.success("Resume text added successfully");
    }
  };

  // Job description URL import (real backend)
  const handleUrlImport = async () => {
    if (!jobDescUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      const res = await fetch('/api/jd-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobDescUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Import failed');
      const text = String(data?.text || '');
      const host = String(data?.host || '');
      setJobDescText(text);
      setImportedFromUrl(host);
      setJobDescMode('editor');
      toast.success(host ? `Job description imported from ${host}` : 'Job description imported');
    } catch (error: any) {
      toast.error(String(error?.message || 'Unable to import from URL. Please try pasting the job description text instead.'));
    }
  };

  // Job description paste handling
  const handleJobDescPaste = () => {
    if (pastedJobDescText.trim()) {
      setJobDescText(pastedJobDescText);
      setJobDescMode("editor");
      toast.success("Job description added successfully");
    }
  };

  // Generate cover letter
  const handleGenerate = async () => {
    if (!resumeText.trim()) {
      toast.error("Please provide your resume information");
      return;
    }

    if (!jobDescText.trim()) {
      toast.error("Please provide the job description");
      return;
    }

    if (resumeText.length > MAX_CHAR_LIMIT) {
      toast.error(`Resume text must be under ${MAX_CHAR_LIMIT.toLocaleString()} characters`);
      return;
    }

    if (jobDescText.length > MAX_CHAR_LIMIT) {
      toast.error(`Job description must be under ${MAX_CHAR_LIMIT.toLocaleString()} characters`);
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch('/api/cover-letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText, jd: jobDescText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Generation failed');
      const letter = String(data?.letter || '');
      setGeneratedLetter(letter);
      toast.success('Cover letter generated successfully!');
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to generate cover letter. Please try again.'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLetter);
      setIsCopied(true);
      toast.success("Cover letter copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Reset functions
  const resetResumeToOriginal = () => {
    setResumeText(originalResumeText);
    toast.success("Resume text reset to original");
  };

  const clearJobDescEditor = () => {
    setJobDescText("");
    setImportedFromUrl("");
    toast.success("Job description cleared");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-semibold">Cover Letter Generator</h1>
              <Badge variant="default" className="text-xs">
                AI-Powered
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs Card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Resume Input Section */}
              <div>
                <h3 className="font-medium mb-4">Resume</h3>
                
                {resumeMode === "choose" && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setResumeMode("upload")}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Resume (PDF/DOCX)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setResumeMode("paste")}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Paste Resume Text
                    </Button>
                  </div>
                )}

                {resumeMode === "upload" && (
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-2">Drop your resume here or click to browse</p>
                      <p className="text-sm text-muted-foreground">PDF or DOCX files, up to 5 MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button variant="ghost" onClick={() => setResumeMode("choose")}>
                      Back to options
                    </Button>
                  </div>
                )}

                {resumeMode === "paste" && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your resume content here..."
                      value={pastedResumeText}
                      onChange={(e) => setPastedResumeText(e.target.value)}
                      className="min-h-32"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={handleResumePaste} disabled={!pastedResumeText.trim()}>
                        Continue
                      </Button>
                      <Button variant="ghost" onClick={() => setResumeMode("choose")}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {resumeMode === "editor" && (
                  <div className="space-y-4">
                    {uploadedFile && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{uploadedFile.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              ref={replaceFileInputRef}
                              type="file"
                              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => replaceFileInputRef.current?.click()}
                            >
                              Replace
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remove uploaded resume"
                              title="Remove uploaded resume"
                              onClick={() => {
                                setUploadedFile(null);
                                setResumeMode("choose");
                                setResumeText("");
                                setOriginalResumeText("");
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <Textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="min-h-40"
                      placeholder="Edit your resume content..."
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{resumeText.length.toLocaleString()} / {MAX_CHAR_LIMIT.toLocaleString()} characters</span>
                      {resumeText.length > MAX_CHAR_LIMIT && (
                        <span className="text-destructive flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Character limit exceeded
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {originalResumeText !== resumeText && (
                        <Button variant="outline" size="sm" onClick={resetResumeToOriginal}>
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setResumeMode("choose")}>
                        Switch input method
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Job Description Section */}
              <div>
                <h3 className="font-medium mb-4">Job Description</h3>
                
                {jobDescMode === "choose" && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setJobDescMode("url")}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Import from URL
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setJobDescMode("paste")}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Paste Job Description
                    </Button>
                  </div>
                )}

                {jobDescMode === "url" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="job-url">Job Posting URL</Label>
                      <Input
                        id="job-url"
                        placeholder="https://company.com/careers/job-posting"
                        value={jobDescUrl}
                        onChange={(e) => setJobDescUrl(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleUrlImport} disabled={!jobDescUrl.trim()}>
                        Import
                      </Button>
                      <Button variant="ghost" onClick={() => setJobDescMode("choose")}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {jobDescMode === "paste" && (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste the job description here..."
                      value={pastedJobDescText}
                      onChange={(e) => setPastedJobDescText(e.target.value)}
                      className="min-h-32"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={handleJobDescPaste} disabled={!pastedJobDescText.trim()}>
                        Continue
                      </Button>
                      <Button variant="ghost" onClick={() => setJobDescMode("choose")}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {jobDescMode === "editor" && (
                  <div className="space-y-4">
                    {importedFromUrl && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Link className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">Imported from {importedFromUrl}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearJobDescEditor}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                    <Textarea
                      value={jobDescText}
                      onChange={(e) => setJobDescText(e.target.value)}
                      className="min-h-40"
                      placeholder="Edit the job description..."
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{jobDescText.length.toLocaleString()} / {MAX_CHAR_LIMIT.toLocaleString()} characters</span>
                      {jobDescText.length > MAX_CHAR_LIMIT && (
                        <span className="text-destructive flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Character limit exceeded
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setJobDescMode("choose")}>
                      Switch input method
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!resumeText.trim() || !jobDescText.trim() || isGenerating || resumeText.length > MAX_CHAR_LIMIT || jobDescText.length > MAX_CHAR_LIMIT}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Cover Letter"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Card */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cover Letter</CardTitle>
                {generatedLetter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={isCopied}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedLetter ? (
                <Textarea
                  value={generatedLetter}
                  readOnly
                  className="min-h-96 resize-none"
                />
              ) : (
                <div className="min-h-96 border border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">Your cover letter will appear here</p>
                    <p className="text-sm">Complete the inputs and click generate to get started</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
