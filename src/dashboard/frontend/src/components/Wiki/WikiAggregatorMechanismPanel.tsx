import { Stack, Typography } from "@mui/material";

import type { WikiAggregatorMechanismPanelProps } from "@/types/wiki/components";
import { MonoBlock, RailList, Surface } from "@/ui";

export function WikiAggregatorMechanismPanel({
  aggregatorDetail,
}: WikiAggregatorMechanismPanelProps) {
  const formulaSettings = aggregatorDetail?.formula_settings ?? [];

  return (
    <Surface
      title="Physics and sync"
      caption="Human-authored notes about how the environment signal evolves and how sensors track it."
    >
      <Stack spacing={2}>
        <div>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            Mechanism
          </Typography>
          <Typography>{aggregatorDetail?.mechanism ?? "No mechanism notes available."}</Typography>
        </div>
        <div>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            Readable formula
          </Typography>
          <Typography>
            {aggregatorDetail?.formula_readable ?? "No readable formula notes available."}
          </Typography>
        </div>
        <div>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            Current settings
          </Typography>
          <RailList
            items={
              formulaSettings.length
                ? formulaSettings.map((setting) => ({
                    label: setting.name,
                    value: (
                      <Stack spacing={0.25}>
                        <Typography sx={{ wordBreak: "break-word" }}>
                          {String(setting.value)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {setting.description}
                        </Typography>
                      </Stack>
                    ),
                  }))
                : [
                    {
                      label: "status",
                      value: "No formula settings available.",
                    },
                  ]
            }
          />
        </div>
        <MonoBlock
          label="Implementation formula"
          value={aggregatorDetail?.formula_code ?? "No implementation formula available."}
          maxHeight={220}
        />
        <div>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            Sensor sync
          </Typography>
          <Typography>{aggregatorDetail?.sensor_sync ?? "No sensor sync notes available."}</Typography>
        </div>
      </Stack>
    </Surface>
  );
}
