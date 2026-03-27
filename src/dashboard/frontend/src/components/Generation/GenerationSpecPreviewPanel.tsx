import { Alert, Box, Stack, Typography } from "@mui/material";

import type { GenerationSpecPreviewPanelProps } from "@/types/generation/components";
import { flattenStructuredValue, RailList, Surface } from "@/ui";

function shouldHidePreviewItem(label: string): boolean {
  const lastSegment = label.split(".").pop();
  return lastSegment === "api_key_source";
}

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

export function GenerationSpecPreviewPanel({
  deferredSpecPath,
  specPreviewPath,
  specPreviewRunId,
  specPreviewOutputRoot,
  specPreviewSelection,
  specPreviewBaseDate,
  specPreviewHome,
  specPreviewLlm,
  specPreviewError,
}: GenerationSpecPreviewPanelProps) {
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
      label: "Output root",
      value: specPreviewOutputRoot,
    },
    {
      label: "Selection",
      value: specPreviewSelection,
    },
    {
      label: "Base date",
      value: specPreviewBaseDate,
    },
  ];
  const homeItems = flattenStructuredValue(compactPreviewValue(specPreviewHome)).filter(
    (item) => item.value !== "null" && !shouldHidePreviewItem(item.label),
  );
  const llmItems = flattenStructuredValue(compactPreviewValue(specPreviewLlm)).filter(
    (item) => item.value !== "null" && !shouldHidePreviewItem(item.label),
  );

  return (
    <Surface
      title="Spec preview"
      caption="Preview the current generation spec path before starting a run."
    >
      <Box
        data-testid="generation-spec-preview-scroll-area"
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
          <PreviewSection title="Home" items={homeItems} />
          <PreviewSection title="LLM" items={llmItems} />
        </Stack>
      </Box>
    </Surface>
  );
}
