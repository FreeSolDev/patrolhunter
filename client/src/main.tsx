import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import DemoPage from "./pages/demo";
import NotFound from "./pages/not-found";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
