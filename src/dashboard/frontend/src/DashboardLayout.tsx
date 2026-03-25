import ApiRoundedIcon from "@mui/icons-material/ApiRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RadarRoundedIcon from "@mui/icons-material/RadarRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useState } from "react";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";

import { useDashboardQuery } from "./api";

const NAV_ITEMS = [
  {
    label: "Simulator",
    path: "/simulator",
    caption: "Live state and control",
    icon: <ScienceRoundedIcon fontSize="small" />,
  },
  {
    label: "Evaluation",
    path: "/evaluation",
    caption: "Runs and logs",
    icon: <RadarRoundedIcon fontSize="small" />,
  },
  {
    label: "API Explorer",
    path: "/api-explorer",
    caption: "Manual request surface",
    icon: <ApiRoundedIcon fontSize="small" />,
  },
  {
    label: "Wiki",
    path: "/wiki",
    caption: "Implemented device library",
    icon: <SchoolRoundedIcon fontSize="small" />,
  },
];

function selectedTab(pathname: string) {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.path));
  return match?.path ?? "/simulator";
}

export function DashboardLayout() {
  const location = useLocation();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const health = useDashboardQuery<Record<string, never>>("/api/__health__", {
    intervalMs: 5000,
  });

  const nav = (
    <List sx={{ minWidth: 260, p: 0 }}>
      {NAV_ITEMS.map((item) => (
        <ListItemButton
          key={item.path}
          component={RouterLink}
          to={item.path}
          selected={selectedTab(location.pathname) === item.path}
          onClick={() => setDrawerOpen(false)}
          sx={{
            alignItems: "flex-start",
            py: 1.5,
            px: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            "&.Mui-selected": {
              backgroundColor: "rgba(15, 118, 110, 0.08)",
            },
          }}
        >
          <Box sx={{ mt: 0.125, mr: 1.5, color: "primary.main" }}>{item.icon}</Box>
          <ListItemText primary={item.label} secondary={item.caption} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ minHeight: "100vh", pb: 4 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar
          sx={{
            gap: 2,
            px: { xs: 1.5, md: 3 },
            py: 4,
            alignItems: "center",
          }}
        >
          {isCompact && (
            <IconButton onClick={() => setDrawerOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{
                maxWidth: 980,
                lineHeight: 1.08,
                textWrap: "balance",
              }}
            >
              SimuHome: A Temporal- and Environment-Aware Benchmark for Smart Home
              LLM Agents
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 1.25 }}
            >
              <Chip
                label="ICLR 2026 Oral"
                variant="filled"
                color="primary"
              />
              <Chip
                label="GitHub"
                variant="outlined"
                component="a"
                clickable
                href="https://github.com/holi-lab/SimuHome"
                target="_blank"
                rel="noreferrer"
                icon={<OpenInNewRoundedIcon fontSize="small" />}
              />
              <Chip
                label="Paper (Arxiv)"
                variant="outlined"
                component="a"
                clickable
                href="https://arxiv.org/abs/2509.24282"
                target="_blank"
                rel="noreferrer"
                icon={<OpenInNewRoundedIcon fontSize="small" />}
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pl: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: health.error ? "#b91c1c" : "#15803d",
                boxShadow: health.error
                  ? "0 0 0 3px rgba(185, 28, 28, 0.14)"
                  : "0 0 0 3px rgba(21, 128, 61, 0.14)",
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {health.error ? "API offline" : "API healthy"}
            </Typography>
          </Stack>
        </Toolbar>
        <Tabs
          value={selectedTab(location.pathname)}
          variant={isCompact ? "scrollable" : "standard"}
          sx={{ px: { xs: 1, md: 3 } }}
        >
          {NAV_ITEMS.map((item) => (
            <Tab
              key={item.path}
              value={item.path}
              icon={item.icon}
              iconPosition="start"
              label={item.label}
              component={RouterLink}
              to={item.path}
            />
          ))}
        </Tabs>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="overline" sx={{ color: "primary.main" }}>
            Sections
          </Typography>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Dashboard routes
          </Typography>
          {nav}
        </Box>
      </Drawer>

      <Box
        sx={{
          width: "min(1600px, calc(100% - 24px))",
          mx: "auto",
          mt: 2.5,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  );
}
