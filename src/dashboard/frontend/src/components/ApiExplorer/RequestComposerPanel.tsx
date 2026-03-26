import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Button, Stack, TextField } from "@mui/material";

import type { RequestComposerPanelProps } from "../../types/apiExplorer/components";
import { MonoBlock, Surface } from "../../ui";

export function RequestComposerPanel({
  selectedRouteMethod,
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
          minRows={10}
          disabled={isGetRoute}
          helperText={
            isGetRoute
              ? "GET routes are sent without a request body."
              : "Body must be valid JSON before the request is sent."
          }
        />
        <MonoBlock label="Latest response" value={responseBlock} maxHeight={360} />
      </Stack>
    </Surface>
  );
}
