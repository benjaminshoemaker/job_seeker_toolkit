
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import CoverLetterPage from "./tools/CoverLetterPage";
import "./index.css";

function Router() {
  const path = window.location.pathname;
  if (path.startsWith("/tools/cover-letter")) {
    return <CoverLetterPage />;
  }
  return <App />;
}

createRoot(document.getElementById("root")!).render(<Router />);
  
