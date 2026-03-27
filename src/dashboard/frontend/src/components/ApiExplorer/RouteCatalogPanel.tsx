import { Box, MenuItem, Select, Stack, Typography } from "@mui/material";

import type { ApiRouteEntry } from "@/api";
import type { RouteCatalogPanelProps } from "@/types/apiExplorer/components";
import { Surface } from "@/ui";

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

export function RouteCatalogPanel({
  selectedKey,
  routes,
  onSelectRoute,
}: RouteCatalogPanelProps) {
  return (
    <Surface title="Route catalog" caption="The current FastAPI surface, indexed for manual execution.">
      <Stack spacing={1.5}>
        <Select
          value={selectedKey}
          onChange={(event) => onSelectRoute(String(event.target.value))}
          displayEmpty
        >
          {routes.map((route) => (
            <MenuItem key={routeKey(route)} value={routeKey(route)}>
              {route.method} {route.path}
            </MenuItem>
          ))}
        </Select>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          {routes.slice(0, 14).map((route) => (
            <Box
              key={routeKey(route)}
              sx={{
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {route.method} {route.path}
              </Typography>
              <Typography color="text.secondary">{route.summary ?? route.name}</Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    </Surface>
  );
}
