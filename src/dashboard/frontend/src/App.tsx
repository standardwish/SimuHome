import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/Layout";
import { ApiExplorerContainer } from "@/pages/ApiExplorer/Container";
import { EvaluationContainer } from "@/pages/Evaluation/Container";
import { EvaluationRunDetailContainer } from "@/pages/EvaluationRunDetail/Container";
import { SimulatorContainer } from "@/pages/Simulator/Container";
import { WikiContainer } from "@/pages/Wiki/Container";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/simulator" replace />} />
        <Route path="/simulator" element={<SimulatorContainer />} />
        <Route path="/evaluation" element={<EvaluationContainer />} />
        <Route path="/evaluation/:runId" element={<EvaluationRunDetailContainer />} />
        <Route path="/api-explorer" element={<ApiExplorerContainer />} />
        <Route path="/wiki" element={<WikiContainer />} />
        <Route path="/wiki/:deviceType" element={<WikiContainer />} />
      </Route>
    </Routes>
  );
}
