import { Alert, Box, Stack, Typography } from "@mui/material";

import type { EvaluationSpecPreviewPanelProps } from "@/types/evaluation/components";
import { flattenStructuredValue, RailList, Surface } from "@/ui";

function compactPreviewValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const compacted = value
      .map((entry) => compactPreviewValue(entry))
      .filter((entry) => entry !== undefined);
    return compacted.length ? compacted : undefined;
  }
  if (typeof value === "object") {
    const compactedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, compactPreviewValue(entry)] as const)
      .filter(([, entry]) => entry !== undefined);
    if (!compactedEntries.length) {
      return undefined;
    }
    return Object.fromEntries(compactedEntries);
  }
  return value;
}

function buildNamedItems(entries: Array<[string, string | null]>): Array<{
  label: string;
  value: string;
}> {
  return entries.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

function PreviewSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.75, fontWeight: 700 }}
      >
        {title}
      </Typography>
      <RailList items={items} labelMaxWidth="260px" valueWrap={false} />
    </Box>
  );
}

export function EvaluationSpecPreviewPanel({
  deferredSpecPath,
  specPreviewPath,
  specPreviewRunId,
  specPreviewEpisodeDir,
  specPreviewSelection,
  specPreviewStrategy,
  specPreviewApi,
  specPreviewJudge,
  specPreviewModels,
  specPreviewError,
}: EvaluationSpecPreviewPanelProps) {
  const previewItems = [
    {
      label: "Path",
      value: specPreviewPath || deferredSpecPath || "—",
    },
    {
      label: "Run id",
      value: specPreviewRunId,
    },
    {
      label: "Episode dir",
      value: specPreviewEpisodeDir,
    },
    {
      label: "Selection",
      value: specPreviewSelection,
    },
    ...flattenStructuredValue(compactPreviewValue(specPreviewStrategy)),
  ];
  const apiItems = buildNamedItems([
    ["base", specPreviewApi.base],
  ]);
  const judgeItems = buildNamedItems([
    ["model", specPreviewJudge.model],
    ["api_base", specPreviewJudge.api_base],
  ]);
  const modelSections = specPreviewModels
    .map((model, index) => ({
      title: `Model ${index + 1}`,
      items: buildNamedItems([
        ["model", model.model],
        ["api_base", model.api_base],
        ["judge_model", model.judge_model],
        ["judge_api_base", model.judge_api_base],
      ]),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Surface
      title="Spec preview"
      caption="Preview the current evaluation spec path before starting a run."
    >
      <Box
        data-testid="evaluation-spec-preview-scroll-area"
        sx={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: 620,
          pr: 0.5,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Stack spacing={1.5}>
          {specPreviewError && <Alert severity="warning">{specPreviewError}</Alert>}
          <RailList items={previewItems} labelMaxWidth="260px" valueWrap={false} />
          <PreviewSection title="API" items={apiItems} />
          <PreviewSection title="Judge" items={judgeItems} />
          {modelSections.length > 0 && (
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.75, fontWeight: 700 }}
              >
                Models
              </Typography>
              <Stack spacing={1.5}>
                {modelSections.map((section) => (
                  <PreviewSection key={section.title} title={section.title} items={section.items} />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Surface>
  );
}
