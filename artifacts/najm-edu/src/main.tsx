import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  return localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token");
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
