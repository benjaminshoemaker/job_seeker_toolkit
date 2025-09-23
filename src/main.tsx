
import { createRoot } from "react-dom/client";
import App from "./App";
import CoverLetterPage from "./tools/CoverLetterPage";
import CoverLetterPageV2 from "./tools/CoverLetterPageV2";
import "./index.css";
// Ensure shadcn/ui tokens are layered after base CSS
import "./styles/shadcn-tokens.css";
// Generate missing Tailwind utility classes (spacing/padding/gap, etc.)
import "./styles/tw-utilities.built.css";

function Router() {
  const path = window.location.pathname;
  if (path === "/tools/cover-letter-v2") return <CoverLetterPageV2 />;
  if (path === "/tools/cover-letter") return <CoverLetterPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(<Router />);
  
