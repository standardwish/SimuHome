import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import type { DeviceDirectoryProps } from "@/types/wiki/components";
import { Surface } from "@/ui";

export function DeviceDirectory({ devices, activeDeviceType }: DeviceDirectoryProps) {
  return (
    <Surface
      title="Device list"
      caption={`${devices.length} supported device types registered in the simulator codebase.`}
    >
      <Box>
        {devices.map((device) => {
          const isActive = activeDeviceType === device.device_type;
          return (
            <Box
              key={device.device_type}
              component={RouterLink}
              to={`/wiki/${device.device_type}`}
              sx={{
                py: 1.25,
                px: 1,
                display: "block",
                color: "inherit",
                textDecoration: "none",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isActive ? "rgba(15, 118, 110, 0.08)" : "transparent",
                transition: "background-color 140ms ease",
                "&:hover": {
                  backgroundColor: isActive
                    ? "rgba(15, 118, 110, 0.12)"
                    : "rgba(17, 24, 39, 0.03)",
                },
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{device.device_type}</Typography>
              <Typography variant="body2" color="text.secondary">
                {device.cluster_count} clusters · {device.command_count} commands · {device.attribute_count} attributes
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}
