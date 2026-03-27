import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from "@mui/material";

import type { ModelGroupAccordionProps } from "@/types/evaluationRunDetail/components";
import { ArtifactAccordion } from "@/components/EvaluationRunDetail/ArtifactAccordion";

export function ModelGroupAccordion({ modelGroup }: ModelGroupAccordionProps) {
  return (
    <Accordion
      disableGutters
      sx={{
        backgroundColor: "transparent",
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">{modelGroup.model}</Typography>
          <Typography color="text.secondary" sx={{ wordBreak: "break-all" }}>
            {modelGroup.path}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0 }}>
        <Stack spacing={1.5}>
          {modelGroup.artifacts.map((artifact) => (
            <ArtifactAccordion key={artifact.file_path} artifact={artifact} />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
