
import { createRoot } from "react-dom/client";
import App from "./App";
import CoverLetterPageV2 from "./tools/CoverLetterPageV2";
import { SiteLayout } from "./components/layout/SiteLayout";
import "./index.css";
// Ensure shadcn/ui tokens are layered after base CSS
import "./styles/shadcn-tokens.css";
// Generate missing Tailwind utility classes (spacing/padding/gap, etc.)
import "./styles/tw-utilities.built.css";

function Router() {
  const path = window.location.pathname;
  if (path === "/tools/cover-letter") return (
    <SiteLayout>
      <CoverLetterPageV2 />
    </SiteLayout>
  );
  return (
    <SiteLayout>
      <App />
    </SiteLayout>
  );
}

createRoot(document.getElementById("root")!).render(<Router />);
  
