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

  const MAX_CHAR_LIMIT = 10000;

  // File upload handling
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB");
      return;
    }

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    // Simulate text extraction (in real app, this would extract from PDF/DOCX)
    const mockExtractedText = `[Extracted from ${file.name}]\n\nJohn Doe\njohn.doe@email.com\n(555) 123-4567\nLinkedIn: linkedin.com/in/johndoe\n\nPROFESSIONAL SUMMARY\nExperienced software engineer with 5+ years of expertise in full-stack development, specializing in React, Node.js, and cloud technologies. Proven track record of delivering scalable web applications and leading cross-functional teams.\n\nEXPERIENCE\nSenior Software Engineer | TechCorp Inc. | 2021 - Present\n• Led development of customer-facing web applications serving 100K+ users\n• Implemented microservices architecture reducing system latency by 40%\n• Mentored junior developers and conducted code reviews\n\nSoftware Engineer | StartupXYZ | 2019 - 2021\n• Built responsive web applications using React and TypeScript\n• Collaborated with design team to implement pixel-perfect UIs\n• Optimized database queries improving application performance by 25%\n\nEDUCATION\nBachelor of Science in Computer Science\nUniversity of Technology | 2015 - 2019\n\nSKILLS\n• Programming: JavaScript, TypeScript, Python, Java\n• Frontend: React, Vue.js, HTML5, CSS3, Tailwind CSS\n• Backend: Node.js, Express, Django, REST APIs\n• Databases: PostgreSQL, MongoDB, Redis\n• Cloud: AWS, Docker, Kubernetes\n• Tools: Git, Jest, Webpack, CI/CD`;

    const uploadedFileData: UploadedFile = {
      name: file.name,
      size: file.size,
      text: mockExtractedText,
    };

    setUploadedFile(uploadedFileData);
    setResumeText(mockExtractedText);
    setOriginalResumeText(mockExtractedText);
    setResumeMode("editor");

    if (mockExtractedText.length < 500) {
      toast("Short extraction detected. You may want to add more details to your resume content.", {
        duration: 4000,
      });
    } else {
      toast.success("Resume uploaded and text extracted successfully");
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

  // Job description URL import
  const handleUrlImport = async () => {
    if (!jobDescUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      // Simulate URL import (in real app, this would scrape the job posting)
      const mockJobDescription = `Software Engineer - Full Stack\nTechCorp Inc. | San Francisco, CA\n\nAbout the Role:\nWe are seeking a talented Full Stack Software Engineer to join our growing engineering team. You will be responsible for developing and maintaining our web applications, working with modern technologies including React, Node.js, and AWS.\n\nResponsibilities:\n• Design and develop scalable web applications using React and Node.js\n• Collaborate with cross-functional teams including product, design, and QA\n• Write clean, maintainable, and well-tested code\n• Participate in code reviews and technical discussions\n• Optimize application performance and ensure security best practices\n• Contribute to architectural decisions and technical roadmap\n\nRequirements:\n• 3+ years of experience in full-stack development\n• Strong proficiency in JavaScript, React, and Node.js\n• Experience with databases (PostgreSQL, MongoDB)\n• Familiarity with cloud platforms (AWS preferred)\n• Knowledge of version control systems (Git)\n• Excellent communication and collaboration skills\n• Bachelor's degree in Computer Science or related field\n\nPreferred Qualifications:\n• Experience with TypeScript\n• Knowledge of containerization (Docker, Kubernetes)\n• Familiarity with CI/CD pipelines\n• Previous startup experience\n\nWe offer competitive compensation, comprehensive benefits, and the opportunity to work with cutting-edge technologies in a fast-paced environment.`;

      const hostname = new URL(jobDescUrl).hostname;
      setJobDescText(mockJobDescription);
      setImportedFromUrl(hostname);
      setJobDescMode("editor");
      toast.success(`Job description imported from ${hostname}`);
    } catch (error) {
      toast.error("Unable to import from URL. Please try pasting the job description text instead.");
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
      // Simulate AI generation (in real app, this would call your AI service)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockGeneratedLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer - Full Stack position at TechCorp Inc. With over 5 years of experience in full-stack development and a proven track record of delivering scalable web applications, I am excited about the opportunity to contribute to your growing engineering team.

In my current role as Senior Software Engineer at TechCorp Inc., I have successfully led the development of customer-facing web applications serving over 100,000 users, directly aligning with your need for someone who can design and develop scalable web applications using React and Node.js. My experience implementing microservices architecture that reduced system latency by 40% demonstrates my ability to optimize application performance and contribute to architectural decisions, which are key requirements for this role. Additionally, my background in mentoring junior developers and conducting code reviews positions me well to participate in your collaborative code review process and technical discussions.

My technical expertise spans the full stack you're seeking, including strong proficiency in JavaScript, React, and Node.js, along with extensive experience with databases like PostgreSQL and MongoDB. I have hands-on experience with AWS cloud services and am well-versed in version control systems, particularly Git. My Bachelor's degree in Computer Science from the University of Technology, combined with my practical experience at both established companies and startups, gives me the diverse perspective and technical foundation you're looking for.

I am particularly drawn to TechCorp Inc.'s commitment to cutting-edge technologies and fast-paced innovation. I am excited about the opportunity to bring my passion for clean, maintainable code and my collaborative approach to your team.

Thank you for considering my application. I look forward to discussing how my experience and enthusiasm can contribute to TechCorp Inc.'s continued success.

Sincerely,
John Doe`;

      setGeneratedLetter(mockGeneratedLetter);
      toast.success("Cover letter generated successfully!");
    } catch (error) {
      toast.error("Failed to generate cover letter. Please try again.");
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
                          <Button
                            variant="ghost"
                            size="sm"
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