import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";

import type { ApiRouteEntry } from "@/api";

type DashboardRouteReferencePanelProps = {
  routes: ApiRouteEntry[];
};

function routeKey(route: ApiRouteEntry) {
  return `${route.method} ${route.path}`;
}

export function DashboardRouteReferencePanel({
  routes,
}: DashboardRouteReferencePanelProps) {
  return (
    <Box
      component="section"
      role="region"
      aria-label="Dashboard APIs reference"
    >
      <Accordion
        elevation={0}
        sx={{
          "&::before": { display: "none" },
          boxShadow: "none",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRoundedIcon />}
          aria-controls="dashboard-api-reference-content"
          id="dashboard-api-reference-header"
        >
          <Box>
            <Typography variant="h6">Dashboard APIs</Typography>
            <Typography color="text.secondary">
              Dashboard-only support routes kept out of the manual request workflow.
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {routes.length === 0 ? (
            <Typography color="text.secondary">
              No dashboard-only routes are registered.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.25 }}>
              {routes.map((route) => (
                <Box
                  key={routeKey(route)}
                  sx={{
                    py: 0.25,
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
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
