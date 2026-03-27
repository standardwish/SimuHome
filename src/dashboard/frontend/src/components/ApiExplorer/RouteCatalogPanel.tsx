import {
  Box,
  Button,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import type { ApiRouteEntry } from "@/api";
import type { RouteCatalogPanelProps } from "@/types/apiExplorer/components";
import { Surface } from "@/ui";

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function compareMethods(left: string, right: string) {
  const leftIndex = METHOD_ORDER.indexOf(left as (typeof METHOD_ORDER)[number]);
  const rightIndex = METHOD_ORDER.indexOf(right as (typeof METHOD_ORDER)[number]);
  const normalizedLeft = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const normalizedRight = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft - normalizedRight;
  }
  return left.localeCompare(right);
}

function groupRoutes(routes: ApiRouteEntry[]) {
  const grouped = new Map<string, ApiRouteEntry[]>();

  for (const route of routes) {
    const current = grouped.get(route.method) ?? [];
    current.push(route);
    grouped.set(route.method, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareMethods(left, right))
    .map(([method, entries]) => [
      method,
      [...entries].sort((left, right) => left.path.localeCompare(right.path)),
    ] as const);
}

export function RouteCatalogPanel({
  selectedKey,
  routes,
  onSelectRoute,
}: RouteCatalogPanelProps) {
  const [listExpanded, setListExpanded] = useState(true);
  const groupedRoutes = groupRoutes(routes);

  return (
    <Surface
      title="Route"
      caption="The API surface, indexed for manual execution."
      aside={
        <Button variant="outlined" onClick={() => setListExpanded((current) => !current)}>
          {listExpanded ? "Hide routes" : "Show routes"}
        </Button>
      }
    >
      <Stack spacing={1.5}>
        <Select
          value={selectedKey}
          onChange={(event) => onSelectRoute(String(event.target.value))}
          displayEmpty
        >
          {groupedRoutes.flatMap(([method, entries]) => [
            <ListSubheader key={`${method}-header`}>{method}</ListSubheader>,
            ...entries.map((route) => (
              <MenuItem key={routeKey(route)} value={routeKey(route)}>
                {route.method} {route.path}
              </MenuItem>
            )),
          ])}
        </Select>

        {listExpanded && (
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
        )}
      </Stack>
    </Surface>
  );
}
