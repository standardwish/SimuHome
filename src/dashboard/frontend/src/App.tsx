import { Navigate, Route, Routes } from "react-router-dom";

import { ApiExplorerPage } from "./ApiExplorerPage";
import { DashboardLayout } from "./DashboardLayout";
import { EvaluationPage } from "./EvaluationPage";
import { SimulatorPage } from "./SimulatorPage";
import { WikiPage } from "./WikiPage";

export function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/simulator" replace />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
        <Route path="/api-explorer" element={<ApiExplorerPage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="/wiki/:deviceType" element={<WikiPage />} />
      </Route>
    </Routes>
  );
}
