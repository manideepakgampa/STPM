import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAppState } from "@/lib/app-state";

const bootstrap = async () => {
  await initializeAppState();
  createRoot(document.getElementById("root")!).render(<App />);
};

void bootstrap();
