import { Toaster } from "../components/ui/sonner";
import { CompanyResearchTool } from "../components/CompanyResearchTool";

export default function CompanyResearchPage() {
  return (
    <div>
      <Toaster position="top-right" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <CompanyResearchTool onBack={() => (window.location.href = "/")} />
      </main>
    </div>
  );
}

