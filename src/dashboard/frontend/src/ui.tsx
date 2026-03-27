import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { type ReactNode } from "react";

type FlattenedRailItem = {
  label: string;
  value: string;
};

function formatStructuredValue(value: unknown): string {
  if (value === undefined) {
    return "—";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value || "—";
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function flattenStructuredValue(
  value: unknown,
  prefix?: string,
): FlattenedRailItem[] {
  if (Array.isArray(value)) {
    if (!value.length) {
      return prefix ? [{ label: prefix, value: "[]" }] : [{ label: "Value", value: "[]" }];
    }
    return value.flatMap((item, index) =>
      flattenStructuredValue(item, prefix ? `${prefix}[${index}]` : `[${index}]`),
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== "schema",
    );
    if (!entries.length) {
      return prefix ? [{ label: prefix, value: "{}" }] : [{ label: "Value", value: "{}" }];
    }
    return entries.flatMap(([key, nestedValue]) =>
      flattenStructuredValue(nestedValue, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [{ label: prefix ?? "Value", value: formatStructuredValue(value) }];
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
        gap: 2,
        alignItems: "end",
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main" }}>
          {eyebrow}
        </Typography>
        <Typography variant="h3" sx={{ maxWidth: 760 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
          {description}
        </Typography>
      </Box>
      {aside}
    </Box>
  );
}

export function Surface({
  title,
  caption,
  aside,
  children,
}: {
  title: string;
  caption?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: aside ? { xs: "1fr", sm: "minmax(0, 1fr) auto" } : "1fr",
          gap: 1.5,
          alignItems: "start",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6">{title}</Typography>
          {caption && (
            <Typography color="text.secondary" sx={{ mt: 0.25 }}>
              {caption}
            </Typography>
          )}
        </Box>
        {aside}
      </Box>
      {children}
    </Paper>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    tone?: "default" | "accent";
    valueSx?: SxProps<Theme>;
  }>;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 1,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            minHeight: 84,
            minWidth: 0,
            px: 1.5,
            py: 1.25,
            border: "1px solid",
            borderColor:
              item.tone === "accent" ? "rgba(15, 118, 110, 0.3)" : "divider",
            backgroundColor:
              item.tone === "accent" ? "rgba(15, 118, 110, 0.08)" : "rgba(255, 255, 255, 0.54)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {item.label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, minWidth: 0, ...item.valueSx }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function RailList({
  items,
  labelMaxWidth = "120px",
  valueWrap = true,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  labelMaxWidth?: string;
  valueWrap?: boolean;
}) {
  return (
    <Stack spacing={1.25}>
      {items.map((item, index) => (
        <Box
          key={`${item.label}-${index}`}
          sx={{
            display: "grid",
            gridTemplateColumns: `fit-content(${labelMaxWidth}) minmax(0, 1fr)`,
            gap: 1.5,
            py: 1,
            borderTop: "1px solid",
            borderColor: "divider",
            alignItems: "start",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              maxWidth: labelMaxWidth,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {item.label}
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            {typeof item.value === "string" ? (
              <Typography
                sx={
                  valueWrap
                    ? { wordBreak: "break-word", overflowWrap: "anywhere" }
                    : { whiteSpace: "nowrap" }
                }
              >
                {item.value}
              </Typography>
            ) : (
              item.value
            )}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function MonoBlock({
  label,
  value,
  maxHeight = 280,
}: {
  label: string;
  value: unknown;
  maxHeight?: number;
}) {
  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        pt: 1.25,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Typography
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          overflow: "auto",
          maxHeight,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          lineHeight: 1.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "rgba(17, 24, 39, 0.03)",
          fontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace',
        }}
      >
        {typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
      </Typography>
    </Box>
  );
}

export function StructuredDataBlock({
  label,
  value,
  maxHeight = 280,
}: {
  label: string;
  value: unknown;
  maxHeight?: number;
}) {
  const items = flattenStructuredValue(value);

  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        pt: 1.25,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Box
        sx={{
          overflow: "auto",
          maxHeight,
          px: 1.25,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "rgba(17, 24, 39, 0.03)",
        }}
      >
        <RailList items={items} />
      </Box>
    </Box>
  );
}
