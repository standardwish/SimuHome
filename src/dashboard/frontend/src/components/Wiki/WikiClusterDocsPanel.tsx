import { Stack } from "@mui/material";

import type { WikiClusterDocsPanelProps } from "@/types/wiki/components";
import { MonoBlock, Surface } from "@/ui";

export function WikiClusterDocsPanel({
  selectedCluster,
  clusterDocContent,
  deviceMetadata,
}: WikiClusterDocsPanelProps) {
  return (
    <Surface
      title="Cluster docs"
      caption="Linked markdown and additional reflected metadata for the active cluster."
    >
      <Stack spacing={1.5}>
        <MonoBlock
          label="Cluster metadata"
          value={selectedCluster?.metadata ?? { note: "No metadata available." }}
          maxHeight={200}
        />
        <MonoBlock
          label="Device metadata"
          value={deviceMetadata ?? { note: "No metadata available." }}
          maxHeight={180}
        />
        <MonoBlock
          label="Cluster markdown"
          value={
            selectedCluster?.doc_path
              ? clusterDocContent ?? "Loading cluster markdown..."
              : "No cluster markdown is linked for the current selection."
          }
          maxHeight={420}
        />
      </Stack>
    </Surface>
  );
}
