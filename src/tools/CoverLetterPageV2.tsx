import { Toaster } from "../components/ui/sonner";
import { CoverLetterGenerator } from "../components/CoverLetterGenerator";

export default function CoverLetterPageV2() {
  return (
    <div>
      <Toaster position="top-right" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <CoverLetterGenerator onBack={() => (window.location.href = "/")} />
      </main>
    </div>
  );
}

