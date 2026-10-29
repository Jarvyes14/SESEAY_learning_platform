import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PlatformProvider } from "./context/PlatformContext.jsx";
import "./styles/index.css";
import { installSpanishValidation } from "./lib/spanish-validation.js";

const clearValidation = installSpanishValidation();
if (import.meta.hot) import.meta.hot.dispose(clearValidation);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>
);
