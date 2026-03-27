import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import type { GenerationRunDetailPresenterProps } from "@/types/pages/generationRunDetail";
import { MetricStrip, MonoBlock, PageIntro, RailList, Surface } from "@/ui";

export function GenerationRunDetailPresenter({
  detail,
  error,
  runId,
}: GenerationRunDetailPresenterProps) {
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedArtifactPath && detail?.artifacts?.[0]) {
      setSelectedArtifactPath(detail.artifacts[0].file_path);
    }
  }, [detail?.artifacts, selectedArtifactPath]);

  const selectedArtifact =
    detail?.artifacts.find((artifact) => artifact.file_path === selectedArtifactPath) ?? null;

  return (
    <Stack spacing={2}>
      <PageIntro
        eyebrow="Generation detail"
        title="Generation detail"
        description="Inspect seed-level outcomes and preview generated episode artifacts for the selected generation run."
        aside={
          <Button
            component={RouterLink}
            to="/generation"
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
          >
            Back to runs
          </Button>
        }
      />

      {error && <Alert severity="warning">{error}</Alert>}

      <Surface title="Run summary" caption="Top-level counts for the current generation run.">
        <Stack spacing={1.5}>
          <MetricStrip
            items={[
              { label: "Total", value: String(detail?.summary.total ?? 0), tone: "accent" },
              { label: "Success", value: String(detail?.summary.success ?? 0) },
              { label: "Failed", value: String(detail?.summary.failed ?? 0) },
              { label: "Pending", value: String(detail?.summary.pending ?? 0) },
            ]}
          />
          <RailList
            items={[
              { label: "Run id", value: detail?.run_id ?? runId ?? "—" },
              { label: "Run path", value: detail?.path ?? "—" },
              { label: "Output dir", value: detail?.summary.output_dir ?? "—" },
            ]}
          />
        </Stack>
      </Surface>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 360px) minmax(0, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <Surface title="Seed status" caption="Per-seed completion state tracked by the generation run.">
            <Stack spacing={1}>
              {(detail?.seeds ?? []).map((seed) => (
                <Box
                  key={String(seed.seed)}
                  sx={{
                    py: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{`Seed ${seed.seed}`}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {seed.status ?? "unknown"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Surface>

          <Surface title="Artifacts" caption="Generated episode files available for preview.">
            <Stack spacing={1}>
              {(detail?.artifacts ?? []).map((artifact) => (
                <Button
                  key={artifact.file_path}
                  variant={selectedArtifactPath === artifact.file_path ? "contained" : "outlined"}
                  onClick={() => setSelectedArtifactPath(artifact.file_path)}
                  sx={{ justifyContent: "flex-start" }}
                >
                  {artifact.file_name}
                </Button>
              ))}
            </Stack>
          </Surface>
        </Stack>

        <Stack spacing={2}>
          <Surface title="Artifact preview" caption="Pretty-printed raw episode payload for the selected artifact.">
            <Stack spacing={1.5}>
              <RailList
                items={[
                  { label: "File", value: selectedArtifact?.file_name ?? "No artifact selected" },
                  { label: "Seed", value: String(selectedArtifact?.seed ?? "—") },
                  { label: "Query type", value: selectedArtifact?.query_type ?? "—" },
                ]}
              />
              <MonoBlock label="Payload" value={selectedArtifact?.raw_payload ?? {}} maxHeight={520} />
            </Stack>
          </Surface>

          <Surface title="Failures and pending seeds" caption="Unfinished generation work that still needs attention.">
            <Stack spacing={1}>
              {(detail?.failed_items ?? []).map((item) => (
                <Typography key={`${item.seed}-${item.error}`}>{`Failed item ${item.seed}: ${item.error}`}</Typography>
              ))}
              {(detail?.pending_seeds ?? []).map((seed) => (
                <Typography key={`pending-${String(seed)}`}>{`Pending item ${seed}`}</Typography>
              ))}
              {(detail?.failed_items?.length ?? 0) === 0 && (detail?.pending_seeds?.length ?? 0) === 0 && (
                <Typography color="text.secondary">No failed or pending seeds.</Typography>
              )}
            </Stack>
          </Surface>
        </Stack>
      </Box>
    </Stack>
  );
}
