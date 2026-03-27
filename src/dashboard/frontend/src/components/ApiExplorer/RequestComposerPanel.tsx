import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { RequestComposerPanelProps } from "@/types/apiExplorer/components";
import { MonoBlock, Surface } from "@/ui";

export function RequestComposerPanel({
  selectedRouteMethod,
  selectedRouteDescription,
  selectedRouteArgs,
  requestPath,
  requestBody,
  responseBlock,
  onRequestPathChange,
  onRequestBodyChange,
  onExecuteSelectedRoute,
}: RequestComposerPanelProps) {
  const isGetRoute = selectedRouteMethod === "GET";

  return (
    <Surface
      title="Request composer"
      caption="Edit path variables inline and send JSON only when the route expects a body."
      aside={
        <Button
          variant="contained"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={onExecuteSelectedRoute}
          disabled={!selectedRouteMethod}
        >
          Execute
        </Button>
      }
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Description
          </Typography>
          <Typography sx={{ mt: 0.5 }}>{selectedRouteDescription}</Typography>
        </Box>
        <Accordion
          elevation={0}
          disableGutters
          sx={{
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "none",
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography sx={{ fontWeight: 600 }}>Arguments</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.25}>
              {selectedRouteArgs.length === 0 ? (
                <Typography color="text.secondary">
                  No documented arguments.
                </Typography>
              ) : (
                selectedRouteArgs.map((arg) => (
                  <Box
                    key={`${arg.name}-${arg.type}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "160px minmax(0, 1fr)" },
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{arg.name}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                        <Chip label={arg.type} size="small" variant="outlined" />
                        <Chip
                          label={arg.required ? "Required" : "Optional"}
                          size="small"
                          color={arg.required ? "primary" : "default"}
                          variant={arg.required ? "filled" : "outlined"}
                        />
                      </Stack>
                    </Box>
                    <Typography color="text.secondary">{arg.description}</Typography>
                  </Box>
                ))
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
        <TextField
          label="Request path"
          value={requestPath}
          onChange={(event) => onRequestPathChange(event.target.value)}
        />
        <TextField
          label="JSON body"
          value={requestBody}
          onChange={(event) => onRequestBodyChange(event.target.value)}
          multiline
          minRows={4}
          disabled={isGetRoute}
          helperText={
            isGetRoute
              ? "GET routes are sent without a request body."
              : "Body must be valid JSON before the request is sent."
          }
        />
        <MonoBlock label="Response" value={responseBlock} maxHeight={360} />
      </Stack>
    </Surface>
  );
}
