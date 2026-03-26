import AirIcon from "@mui/icons-material/Air";
import DeviceThermostatIcon from "@mui/icons-material/DeviceThermostat";
import OpacityIcon from "@mui/icons-material/Opacity";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { HomeState } from "../../api";
import type { LiveHomeSurfaceProps, RoomLayout, TreemapRect } from "../../types/simulator/components";
import { RoomViewModel } from "../../types/simulator/models";
import { MetricStrip, Surface } from "../../ui";

const ROOM_ORDER = [
  "living_room",
  "kitchen",
  "bedroom",
  "dining_room",
  "office",
  "study_room",
  "kids_room",
  "bathroom",
  "utility_room",
] as const;

const ROOM_ACCENT_BY_TYPE: Record<string, string> = {
  living_room: "#0f766e",
  kitchen: "#d97706",
  bathroom: "#2563eb",
  utility_room: "#6d28d9",
  bedroom: "#be185d",
  dining_room: "#b45309",
  study_room: "#0f766e",
  kids_room: "#db2777",
  office: "#1d4ed8",
};

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 620;
const BLUEPRINT = "#10324a";
const BLUEPRINT_SOFT = "#5f7d95";
const ROOM_WEIGHT_BY_TYPE: Record<string, number> = {
  living_room: 28,
  kitchen: 22,
  bedroom: 20,
  dining_room: 18,
  office: 16,
  study_room: 16,
  kids_room: 15,
  bathroom: 19,
  utility_room: 18,
};

const ROOM_MIN_SIZE_BY_TYPE: Record<string, { minWidth: number; minHeight: number }> = {
  living_room: { minWidth: 280, minHeight: 220 },
  kitchen: { minWidth: 230, minHeight: 180 },
  bathroom: { minWidth: 210, minHeight: 170 },
  utility_room: { minWidth: 210, minHeight: 170 },
};

function titleizeRoom(roomId: string): string {
  return roomId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStateValue(key: string, value: number | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }
  if (key === "temperature") {
    return `${(value / 100).toFixed(1)} C`;
  }
  if (key === "humidity") {
    return `${(value / 100).toFixed(1)} %`;
  }
  if (key === "illuminance") {
    return `${Math.round(value)} lux`;
  }
  if (key === "pm10") {
    return `${Math.round(value)} ug/m3`;
  }
  return String(value);
}

export function summarizeRoomState(state: Record<string, number>): Array<{ label: string; value: string }> {
  return [
    { label: "Temperature", value: formatStateValue("temperature", state.temperature) },
    { label: "Light", value: formatStateValue("illuminance", state.illuminance) },
    { label: "Humidity", value: formatStateValue("humidity", state.humidity) },
    { label: "PM10", value: formatStateValue("pm10", state.pm10) },
  ];
}

export function normalizeRooms(home: HomeState | null): RoomViewModel[] {
  return Object.entries(home?.rooms ?? {})
    .map(([roomId, room]) => ({
      roomId,
      label: titleizeRoom(roomId),
      state: room.state ?? {},
      devices: room.devices ?? [],
    }))
    .sort((left, right) => {
      const leftIndex = ROOM_ORDER.indexOf(left.roomId as (typeof ROOM_ORDER)[number]);
      const rightIndex = ROOM_ORDER.indexOf(right.roomId as (typeof ROOM_ORDER)[number]);
      const normalizedLeft = leftIndex === -1 ? ROOM_ORDER.length : leftIndex;
      const normalizedRight = rightIndex === -1 ? ROOM_ORDER.length : rightIndex;
      return normalizedLeft - normalizedRight || left.roomId.localeCompare(right.roomId);
    });
}

function getRoomWeight(roomId: string): number {
  return ROOM_WEIGHT_BY_TYPE[roomId] ?? 14;
}

function computeRoomLayouts(roomIds: string[]): RoomLayout[] {
  if (roomIds.length === 0) {
    return [];
  }

  const sorted = [...roomIds].sort((left, right) => {
    return getRoomWeight(right) - getRoomWeight(left) || left.localeCompare(right);
  });
  const root: TreemapRect = { x: 20, y: 20, width: VIEWBOX_WIDTH - 40, height: VIEWBOX_HEIGHT - 40 };
  const anchorRoomId = sorted.includes("living_room") ? "living_room" : sorted[0];
  const trailing = sorted.filter((roomId) => roomId !== anchorRoomId);

  function makeLayout(roomId: string, rect: TreemapRect): RoomLayout {
    return {
      roomId,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  function splitRow(ids: string[], rect: TreemapRect): RoomLayout[] {
    if (ids.length === 0) {
      return [];
    }
    const totalWeight = ids.reduce((sum, roomId) => sum + getRoomWeight(roomId), 0);
    let offsetX = rect.x;
    return ids.map((roomId, index) => {
      const remainingWidth = rect.x + rect.width - offsetX;
      const width =
        index === ids.length - 1
          ? remainingWidth
          : Math.max(
              ROOM_MIN_SIZE_BY_TYPE[roomId]?.minWidth ?? 120,
              Math.round((rect.width * getRoomWeight(roomId)) / totalWeight),
            );
      const layout = makeLayout(roomId, {
        x: offsetX,
        y: rect.y,
        width: Math.min(width, remainingWidth),
        height: rect.height,
      });
      offsetX += layout.width;
      return layout;
    });
  }

  function splitColumn(ids: string[], rect: TreemapRect): RoomLayout[] {
    if (ids.length === 0) {
      return [];
    }
    const totalWeight = ids.reduce((sum, roomId) => sum + getRoomWeight(roomId), 0);
    let offsetY = rect.y;
    return ids.map((roomId, index) => {
      const remainingHeight = rect.y + rect.height - offsetY;
      const height =
        index === ids.length - 1
          ? remainingHeight
          : Math.max(
              ROOM_MIN_SIZE_BY_TYPE[roomId]?.minHeight ?? 110,
              Math.round((rect.height * getRoomWeight(roomId)) / totalWeight),
            );
      const layout = makeLayout(roomId, {
        x: rect.x,
        y: offsetY,
        width: rect.width,
        height: Math.min(height, remainingHeight),
      });
      offsetY += layout.height;
      return layout;
    });
  }

  if (sorted.length === 1) {
    return [makeLayout(sorted[0], root)];
  }

  if (sorted.length === 2) {
    const anchorWidth = Math.round(root.width * 0.58);
    return [
      makeLayout(anchorRoomId, { x: root.x, y: root.y, width: anchorWidth, height: root.height }),
      makeLayout(trailing[0], {
        x: root.x + anchorWidth,
        y: root.y,
        width: root.width - anchorWidth,
        height: root.height,
      }),
    ];
  }

  if (sorted.length === 3) {
    const anchorWidth = Math.round(root.width * 0.56);
    const rightRect = { x: root.x + anchorWidth, y: root.y, width: root.width - anchorWidth, height: root.height };
    return [
      makeLayout(anchorRoomId, { x: root.x, y: root.y, width: anchorWidth, height: root.height }),
      ...splitColumn(trailing, rightRect),
    ];
  }

  if (sorted.length === 4) {
    const anchorWidth = Math.round(root.width * 0.52);
    const rightRect = { x: root.x + anchorWidth, y: root.y, width: root.width - anchorWidth, height: root.height };
    const topHeight = Math.round(rightRect.height * 0.54);
    return [
      makeLayout(anchorRoomId, { x: root.x, y: root.y, width: anchorWidth, height: root.height }),
      makeLayout(trailing[0], { x: rightRect.x, y: rightRect.y, width: rightRect.width, height: topHeight }),
      ...splitRow(trailing.slice(1), {
        x: rightRect.x,
        y: rightRect.y + topHeight,
        width: rightRect.width,
        height: rightRect.height - topHeight,
      }),
    ];
  }

  if (sorted.length === 5) {
    const anchorWidth = Math.round(root.width * 0.48);
    const rightRect = { x: root.x + anchorWidth, y: root.y, width: root.width - anchorWidth, height: root.height };
    const topHeight = Math.round(rightRect.height * 0.46);
    return [
      makeLayout(anchorRoomId, { x: root.x, y: root.y, width: anchorWidth, height: root.height }),
      ...splitRow(trailing.slice(0, 2), { x: rightRect.x, y: rightRect.y, width: rightRect.width, height: topHeight }),
      ...splitRow(trailing.slice(2), {
        x: rightRect.x,
        y: rightRect.y + topHeight,
        width: rightRect.width,
        height: rightRect.height - topHeight,
      }),
    ];
  }

  const anchorWidth = Math.round(root.width * 0.46);
  const centerWidth = Math.round((root.width - anchorWidth) * 0.34);
  const rightWidth = root.width - anchorWidth - centerWidth;
  const centerRect = { x: root.x + anchorWidth, y: root.y, width: centerWidth, height: root.height };
  const rightRect = { x: centerRect.x + centerWidth, y: root.y, width: rightWidth, height: root.height };
  return [
    makeLayout(anchorRoomId, { x: root.x, y: root.y, width: anchorWidth, height: root.height }),
    ...splitColumn(trailing.slice(0, 2), centerRect),
    ...splitColumn(trailing.slice(2), rightRect),
  ];
}

function getRoomWallSegments(layout: RoomLayout): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const left = layout.x;
  const top = layout.y;
  const right = layout.x + layout.width;
  const bottom = layout.y + layout.height;
  return [
    { x1: left, y1: top, x2: right, y2: top },
    { x1: right, y1: top, x2: right, y2: bottom },
    { x1: right, y1: bottom, x2: left, y2: bottom },
    { x1: left, y1: bottom, x2: left, y2: top },
  ];
}

function getDeviceGlyphShape(deviceType: string): "circle" | "square" | "diamond" | "pill" {
  if (deviceType.includes("light")) {
    return "circle";
  }
  if (
    deviceType.includes("washer") ||
    deviceType.includes("dryer") ||
    deviceType.includes("dishwasher") ||
    deviceType.includes("refrigerator") ||
    deviceType.includes("freezer")
  ) {
    return "square";
  }
  if (
    deviceType.includes("conditioner") ||
    deviceType.includes("heat_pump") ||
    deviceType.includes("purifier") ||
    deviceType.includes("fan")
  ) {
    return "diamond";
  }
  return "pill";
}

function getDeviceIconNode(deviceType: string): ReactNode {
  if (deviceType.includes("light")) {
    return <WbSunnyIcon sx={{ fontSize: 18 }} />;
  }
  if (deviceType.includes("washer") || deviceType.includes("dryer") || deviceType.includes("dishwasher")) {
    return <OpacityIcon sx={{ fontSize: 18 }} />;
  }
  if (
    deviceType.includes("conditioner") ||
    deviceType.includes("heat_pump") ||
    deviceType.includes("purifier") ||
    deviceType.includes("fan")
  ) {
    return <AirIcon sx={{ fontSize: 18 }} />;
  }
  return <DeviceThermostatIcon sx={{ fontSize: 18 }} />;
}

export function LiveHomeSurface({
  currentTick,
  currentTime,
  tickInterval,
  roomEntries,
  selectedRoomId,
  selectedDeviceId,
  hoveredRoomId,
  hoveredDeviceId,
  changedRoomIds,
  onHoverRoom,
  onHoverDevice,
  onSelectRoom,
  onSelectDevice,
}: LiveHomeSurfaceProps) {
  const layoutMap = useMemo(() => {
    return new Map(computeRoomLayouts(roomEntries.map((room) => room.roomId)).map((layout) => [layout.roomId, layout]));
  }, [roomEntries]);

  return (
    <Surface
      title="Live home"
      caption="A blueprint-style floor plan for room state, device position, and quick selection."
    >
      <Stack spacing={2}>
        <MetricStrip
          items={[
            {
              label: "Current tick",
              value: String(currentTick ?? "—"),
              tone: "accent",
            },
            { label: "Virtual time", value: currentTime ?? "—" },
            { label: "Tick interval", value: String(tickInterval ?? "—") },
            { label: "Rooms", value: String(roomEntries.length) },
          ]}
        />

        <Box
          data-testid="live-home-snapshot-viewport"
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 2,
          }}
        >
          {roomEntries.length === 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography color="text.secondary">
                No rooms are available in the current snapshot.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                position: "relative",
                borderRadius: 0,
                overflow: "hidden",
              }}
            >
              <Box
                component="svg"
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                sx={{ display: "block", width: "100%", height: "auto", position: "relative", zIndex: 1 }}
              >
                <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f7fbff" />
                {roomEntries.map((room) => {
                  const layout = layoutMap.get(room.roomId);
                  if (!layout) {
                    return null;
                  }
                  const wallSegments = getRoomWallSegments(layout);
                  const isRoomSelected = selectedRoomId === room.roomId;
                  const isRoomHovered = hoveredRoomId === room.roomId;
                  const roomChanged = changedRoomIds.includes(room.roomId);
                  const accent = ROOM_ACCENT_BY_TYPE[room.roomId] ?? "#475569";
                  const topState = summarizeRoomState(room.state).slice(0, 2);
                  return (
                    <g
                      key={room.roomId}
                      data-testid={`room-${room.roomId}`}
                      onMouseEnter={() => onHoverRoom(room.roomId)}
                      onMouseLeave={() => onHoverRoom(null)}
                      onClick={() => onSelectRoom(room.roomId, room.devices[0]?.device_id ?? null)}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={layout.x}
                        y={layout.y}
                        width={layout.width}
                        height={layout.height}
                        rx={0}
                        fill={
                          isRoomSelected
                            ? alpha(accent, 0.06)
                            : isRoomHovered
                              ? "rgba(255,255,255,0.78)"
                              : "rgba(255,255,255,0.38)"
                        }
                        stroke="transparent"
                      />
                      {wallSegments.map((segment, index) => (
                        <line
                          key={`${room.roomId}-wall-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          stroke={
                            isRoomSelected
                              ? accent
                              : isRoomHovered || roomChanged
                                ? alpha(accent, 0.8)
                                : alpha(BLUEPRINT, 0.82)
                          }
                          strokeWidth={isRoomSelected ? 5 : 4}
                          strokeLinecap="square"
                        />
                      ))}
                      <line
                        x1={layout.x + 22}
                        y1={layout.y + 48}
                        x2={layout.x + layout.width - 22}
                        y2={layout.y + 48}
                        stroke={alpha(BLUEPRINT, 0.08)}
                        strokeWidth="1"
                        strokeDasharray="6 6"
                      />
                      <text
                        x={layout.x + 24}
                        y={layout.y + 42}
                        fill={BLUEPRINT}
                        fontSize="24"
                        fontWeight="700"
                      >
                        {room.label}
                      </text>
                      {topState.map((item, index) => (
                        <text
                          key={`${room.roomId}-${item.label}`}
                          x={layout.x + 24}
                          y={layout.y + 92 + index * 24}
                          fill={BLUEPRINT_SOFT}
                          fontSize="15"
                          fontWeight="700"
                        >
                          {item.label.toUpperCase()} {item.value}
                        </text>
                      ))}
                      {room.devices.map((device, deviceIndex) => {
                        const markerColumns = Math.max(1, Math.min(3, Math.floor((layout.width - 60) / 120)));
                        const markerX =
                          layout.x + 54 + (deviceIndex % markerColumns) * ((layout.width - 108) / markerColumns);
                        const markerY = layout.y + 198 + Math.floor(deviceIndex / markerColumns) * 80;
                        const isDeviceSelected = selectedDeviceId === device.device_id;
                        const isDeviceHovered = hoveredDeviceId === device.device_id;
                        const glyphShape = getDeviceGlyphShape(device.device_type);
                        return (
                          <g
                            key={device.device_id}
                            data-testid={`device-${device.device_id}`}
                            onMouseEnter={(event) => {
                              event.stopPropagation();
                              onHoverDevice(device.device_id);
                            }}
                            onMouseLeave={(event) => {
                              event.stopPropagation();
                              onHoverDevice(null);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectDevice(room.roomId, device.device_id);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {glyphShape === "circle" && (
                              <circle
                                cx={markerX}
                                cy={markerY}
                                r={isDeviceSelected ? 16 : 13}
                                fill="#f8fbfd"
                                stroke={isDeviceSelected ? accent : alpha(BLUEPRINT, 0.72)}
                                strokeWidth={isDeviceSelected ? 3.5 : 2.5}
                              />
                            )}
                            {glyphShape === "square" && (
                              <rect
                                x={markerX - (isDeviceSelected ? 16 : 13)}
                                y={markerY - (isDeviceSelected ? 16 : 13)}
                                width={isDeviceSelected ? 32 : 26}
                                height={isDeviceSelected ? 32 : 26}
                                rx="4"
                                fill="#f8fbfd"
                                stroke={isDeviceSelected ? accent : alpha(BLUEPRINT, 0.72)}
                                strokeWidth={isDeviceSelected ? 3.5 : 2.5}
                              />
                            )}
                            {glyphShape === "diamond" && (
                              <polygon
                                points={`${markerX},${markerY - 17} ${markerX + 17},${markerY} ${markerX},${markerY + 17} ${markerX - 17},${markerY}`}
                                fill="#f8fbfd"
                                stroke={isDeviceSelected ? accent : alpha(BLUEPRINT, 0.72)}
                                strokeWidth={isDeviceSelected ? 3.5 : 2.5}
                              />
                            )}
                            {glyphShape === "pill" && (
                              <rect
                                x={markerX - 19}
                                y={markerY - 12}
                                width="38"
                                height="24"
                                rx="12"
                                fill="#f8fbfd"
                                stroke={isDeviceSelected ? accent : alpha(BLUEPRINT, 0.72)}
                                strokeWidth={isDeviceSelected ? 3.5 : 2.5}
                              />
                            )}
                            {(isDeviceSelected || isDeviceHovered) && (
                              <circle
                                cx={markerX}
                                cy={markerY}
                                r={isDeviceSelected ? 24 : 21}
                                fill="transparent"
                                stroke={alpha(accent, isDeviceSelected ? 0.3 : 0.14)}
                                strokeWidth="1.5"
                                strokeDasharray="3 4"
                              />
                            )}
                            <foreignObject x={markerX - 11} y={markerY - 11} width="22" height="22">
                              <Box
                                sx={{
                                  width: 22,
                                  height: 22,
                                  color: isDeviceSelected ? accent : BLUEPRINT,
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                {getDeviceIconNode(device.device_type)}
                              </Box>
                            </foreignObject>
                            <line
                              x1={markerX + 20}
                              y1={markerY}
                              x2={markerX + 36}
                              y2={markerY}
                              stroke={alpha(BLUEPRINT, 0.36)}
                              strokeWidth="1.5"
                            />
                            <text
                              x={markerX + 42}
                              y={markerY + 4}
                              fill={BLUEPRINT}
                              fontSize="11"
                              fontWeight={isDeviceSelected ? "700" : "500"}
                            >
                              {device.device_type}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Stack>
    </Surface>
  );
}
