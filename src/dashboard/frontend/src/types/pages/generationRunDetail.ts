import type { GenerationRunDetail } from "@/api";

export type GenerationRunDetailPresenterProps = {
  detail: GenerationRunDetail | null;
  error: string | null;
  runId: string | undefined;
};
