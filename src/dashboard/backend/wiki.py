from __future__ import annotations

import ast
import inspect
import re
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from inspect import signature
from pathlib import Path
from typing import Any

from fastapi.routing import APIRoute

from src.simulator.application.device_factory import (
    create_device,
    get_supported_device_types,
    is_valid_device_type,
)
from src.simulator.domain.aggregators.registry import AGGREGATOR_REGISTRY
from src.simulator.domain.clusters.base import Cluster
from src.simulator.domain.devices.base import Device


DOCS_ROOT = Path(__file__).resolve().parents[3] / "docs" / "clusters"
AGENT_TOOLS_PATH = Path(__file__).resolve().parents[2] / "agents" / "tools.py"
DESCRIPTION_NOT_PROVIDED = "Description is not provided."
ROUTE_TOOL_DOC_MAP: dict[tuple[str, str], str] = {
    ("POST", "/api/devices/add"): "add_device",
    ("DELETE", "/api/devices/{device_id}"): "remove_device",
    ("POST", "/api/simulation/tick_interval"): "set_tick_interval",
    ("POST", "/api/devices/{device_id}/commands"): "execute_command",
    ("POST", "/api/devices/{device_id}/attributes/write"): "write_attribute",
    ("GET", "/api/devices/{device_id}/structure"): "get_device_structure",
    ("GET", "/api/devices/{device_id}/attributes"): "get_all_attributes",
    (
        "GET",
        "/api/devices/{device_id}/attributes/{endpoint_id}/{cluster_id}/{attribute_id}",
    ): "get_attribute",
    ("GET", "/api/rooms/{room_id}/devices"): "get_room_devices",
    ("GET", "/api/rooms/{room_id}/states"): "get_room_states",
    ("GET", "/api/home/state"): "get_home_state",
    ("POST", "/api/schedule/workflow"): "schedule_workflow",
    ("GET", "/api/schedule/workflow/{workflow_id}/status"): "get_workflow_status",
    ("POST", "/api/schedule/workflow/{workflow_id}/cancel"): "cancel_workflow",
    ("GET", "/api/time"): "get_current_time",
    ("GET", "/api/schedule/workflows"): "get_workflow_list",
    ("GET", "/api/rooms"): "get_rooms",
    ("GET", "/api/environment/control_rules/{state}"): "get_environment_control_rules",
}
ARG_LINE_PATTERN = re.compile(
    r"^(?P<name>[\w_]+)\s*\((?P<type>[^)]+)\):\s*"
    r"(?P<description>.*?)(?:\s*\[(?P<required>required)\])?$"
)
AGGREGATOR_WIKI_METADATA: dict[str, dict[str, str]] = {
    "temperature": {
        "environment_signal": "Temperature",
        "summary": "Tracks room temperature from HVAC and air movement devices.",
        "mechanism": (
            "Uses heat exchange from active HVAC devices and passive restoration "
            "toward the baseline temperature."
        ),
        "formula_readable": (
            "current_value(t+1) = current_value(t) + total device heating/cooling "
            "effect + restoration toward baseline"
        ),
        "formula_code": (
            "restoration_delta = baseline_value - current_value\n"
            "current_value += total_effect\n"
            "current_value += restoration_delta * restoration_rate_per_second * tick_interval"
        ),
        "sensor_sync": (
            "Thermostat and temperature-reporting sensor clusters are synchronized "
            "from the aggregated environment temperature."
        ),
    },
    "pm10": {
        "environment_signal": "PM10",
        "summary": "Tracks airborne particulate concentration and air purifier effects.",
        "mechanism": (
            "Applies continuous purification from active purifiers and gradual "
            "restoration toward the baseline pollution level."
        ),
        "formula_readable": (
            "current_value(t+1) = current_value(t) - purification effect + "
            "restoration toward baseline"
        ),
        "formula_code": (
            "current_value += total_purification\n"
            "restoration_delta = baseline_value - current_value\n"
            "current_value += restoration_delta * restoration_rate_per_second * tick_interval"
        ),
        "sensor_sync": (
            "Air quality and particulate-reporting clusters are synchronized from "
            "the aggregated PM10 concentration."
        ),
    },
    "illuminance": {
        "environment_signal": "Illuminance",
        "summary": "Tracks perceived room brightness from lighting devices.",
        "mechanism": (
            "Combines a baseline ambient illuminance level with additive light "
            "contributions from active fixtures."
        ),
        "formula_readable": (
            "current_value = baseline ambient illuminance + sum(active light contributions)"
        ),
        "formula_code": (
            "total_illuminance = baseline_value\n"
            "for device in monitored_devices:\n"
            "    total_illuminance += device_contribution(device)\n"
            "current_value = total_illuminance"
        ),
        "sensor_sync": (
            "Brightness-dependent environment readings are interpreted from the "
            "aggregated illuminance state."
        ),
    },
    "humidity": {
        "environment_signal": "Humidity",
        "summary": "Tracks room humidity from humidifiers and dehumidifiers.",
        "mechanism": (
            "Applies continuous humidifying or dehumidifying effects and gradual "
            "restoration toward the baseline humidity."
        ),
        "formula_readable": (
            "current_value(t+1) = current_value(t) + humidifying/dehumidifying effect "
            "+ restoration toward baseline"
        ),
        "formula_code": (
            "current_value += total_effect\n"
            "restoration_delta = baseline_value - current_value\n"
            "current_value += restoration_delta * restoration_rate_per_second * tick_interval"
        ),
        "sensor_sync": (
            "Relative humidity measurement clusters are synchronized from the "
            "aggregated humidity state."
        ),
    },
}


@dataclass(frozen=True)
class ClusterDocLink:
    cluster_id: str
    path: str


@dataclass(frozen=True)
class ToolArgDoc:
    name: str
    type: str
    description: str
    required: bool


@dataclass(frozen=True)
class ToolDoc:
    summary: str
    description: str
    args: tuple[ToolArgDoc, ...]


def build_api_catalog(routes: list[Any]) -> dict[str, Any]:
    catalog: list[dict[str, Any]] = []
    for route in routes:
        if not isinstance(route, APIRoute):
            continue
        if not route.path.startswith("/api"):
            continue

        methods = sorted(method for method in route.methods or [] if method != "HEAD")
        for method in methods:
            tool_doc = _tool_doc_for_route(method, route.path)
            catalog.append(
                {
                    "method": method,
                    "path": route.path,
                    "name": route.name,
                    "summary": tool_doc.summary,
                    "description": tool_doc.description,
                    "args": [
                        {
                            "name": arg.name,
                            "type": arg.type,
                            "description": arg.description,
                            "required": arg.required,
                        }
                        for arg in tool_doc.args
                    ],
                }
            )

    catalog.sort(key=lambda item: (item["path"], item["method"]))
    return {"routes": catalog}


def get_device_types_payload() -> dict[str, Any]:
    device_types = sorted(get_supported_device_types())
    return {
        "device_types": device_types,
        "devices": [_build_device_summary(device_type) for device_type in device_types],
        "source": "device_factory",
    }


def get_device_type_payload(device_type: str) -> dict[str, Any]:
    if not is_valid_device_type(device_type):
        raise ValueError(f"Unsupported device type: {device_type}")

    return _build_device_payload(device_type)


def get_aggregators_payload() -> dict[str, Any]:
    aggregator_types = sorted(AGGREGATOR_REGISTRY.keys())
    return {
        "aggregator_types": aggregator_types,
        "aggregators": [
            _build_aggregator_summary(aggregator_type)
            for aggregator_type in aggregator_types
        ],
        "source": "aggregator_registry",
    }


def get_aggregator_payload(aggregator_type: str) -> dict[str, Any]:
    if aggregator_type not in AGGREGATOR_REGISTRY:
        raise ValueError(f"Unsupported aggregator type: {aggregator_type}")
    return _build_aggregator_payload(aggregator_type)


@lru_cache(maxsize=64)
def _build_device_payload(device_type: str) -> dict[str, Any]:
    device = create_device(device_type, f"{device_type}_example")
    structure = device.get_structure()

    clusters: dict[str, dict[str, Any]] = {}
    for endpoint in device.endpoints.values():
        for cluster_id, cluster in endpoint.items():
            cluster_info = cluster.get_structure()
            cluster_info["command_args"] = _command_args(cluster.commands)
            cluster_info["doc_path"] = _cluster_doc_path(cluster_id)
            cluster_info["implementation"] = _implementation_info(cluster)
            cluster_info["metadata"] = _public_metadata(
                cluster,
                excluded={"attributes", "commands", "readonly_attributes", "cluster_id"},
            )
            clusters[cluster_id] = cluster_info

    return {
        "device_type": device_type,
        "structure": structure,
        "clusters": clusters,
        "implementation": _implementation_info(device),
        "metadata": _public_metadata(
            device,
            excluded={
                "endpoints",
                "device_id",
                "device_type",
            },
        ),
        "source": "device_factory",
    }


def _build_device_summary(device_type: str) -> dict[str, Any]:
    payload = _build_device_payload(device_type)
    clusters = payload["clusters"]
    return {
        "device_type": device_type,
        "endpoint_ids": sorted(payload["structure"]["endpoints"].keys(), key=int),
        "cluster_count": len(clusters),
        "attribute_count": sum(
            len(cluster["attributes"]) for cluster in clusters.values()
        ),
        "command_count": sum(len(cluster["commands"]) for cluster in clusters.values()),
        "doc_cluster_count": sum(
            1 for cluster in clusters.values() if cluster.get("doc_path")
        ),
        "implementation": payload["implementation"],
    }


def get_cluster_doc_payload(cluster_id: str) -> dict[str, Any]:
    doc_path = _cluster_doc_path(cluster_id)
    if doc_path is None:
        raise ValueError(f"No cluster documentation found for {cluster_id}")

    path = Path(doc_path)
    return {
        "cluster_id": cluster_id,
        "path": str(path),
        "content": path.read_text(encoding="utf-8"),
    }


def _tool_doc_for_route(method: str, path: str) -> ToolDoc:
    tool_name = ROUTE_TOOL_DOC_MAP.get((method, path))
    if tool_name is None:
        return ToolDoc(
            summary=DESCRIPTION_NOT_PROVIDED,
            description=DESCRIPTION_NOT_PROVIDED,
            args=(),
        )
    return _load_agent_tool_docs().get(
        tool_name,
        ToolDoc(
            summary=DESCRIPTION_NOT_PROVIDED,
            description=DESCRIPTION_NOT_PROVIDED,
            args=(),
        ),
    )


@lru_cache(maxsize=1)
def _load_agent_tool_docs() -> dict[str, ToolDoc]:
    parsed = ast.parse(AGENT_TOOLS_PATH.read_text(encoding="utf-8"))
    docs: dict[str, ToolDoc] = {}

    for node in parsed.body:
        if not isinstance(node, ast.FunctionDef) or not node.name.startswith("tool_"):
            continue
        docstring = ast.get_docstring(node)
        if not docstring:
            continue
        docs[node.name.removeprefix("tool_")] = _parse_tool_docstring(docstring)

    return docs


def _parse_tool_docstring(docstring: str) -> ToolDoc:
    lines = inspect.cleandoc(docstring).splitlines()
    description_lines, args_lines = _split_tool_doc_sections(lines)
    description = " ".join(line.strip() for line in description_lines if line.strip())
    normalized_description = description or DESCRIPTION_NOT_PROVIDED
    summary = next(
        (line.strip() for line in description_lines if line.strip()),
        DESCRIPTION_NOT_PROVIDED,
    )
    args = tuple(_parse_tool_args(args_lines))
    return ToolDoc(
        summary=summary,
        description=normalized_description,
        args=args,
    )


def _split_tool_doc_sections(lines: list[str]) -> tuple[list[str], list[str]]:
    description_lines: list[str] = []
    args_lines: list[str] = []
    active_section = "description"

    for line in lines:
        stripped = line.strip()
        if stripped == "Args:":
            active_section = "args"
            continue
        if stripped == "Returns:":
            break
        if active_section == "description":
            description_lines.append(line)
        elif active_section == "args":
            args_lines.append(line)

    return description_lines, args_lines


def _parse_tool_args(lines: list[str]) -> list[ToolArgDoc]:
    parsed_args: list[ToolArgDoc] = []
    current_arg: ToolArgDoc | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line == "(none)":
            continue

        match = ARG_LINE_PATTERN.match(line)
        if match:
            current_arg = ToolArgDoc(
                name=match.group("name"),
                type=match.group("type").strip(),
                description=match.group("description").strip(),
                required=match.group("required") == "required",
            )
            parsed_args.append(current_arg)
            continue

        if current_arg is None:
            continue

        updated_description = f"{current_arg.description} {line}".strip()
        parsed_args[-1] = ToolArgDoc(
            name=current_arg.name,
            type=current_arg.type,
            description=updated_description,
            required=current_arg.required,
        )
        current_arg = parsed_args[-1]

    return parsed_args


@lru_cache(maxsize=32)
def _build_aggregator_payload(aggregator_type: str) -> dict[str, Any]:
    aggregator_cls, aggregator_config = AGGREGATOR_REGISTRY[aggregator_type]
    doc_metadata = AGGREGATOR_WIKI_METADATA[aggregator_type]
    aggregator = aggregator_cls(
        agg_id=f"{aggregator_type}_wiki",
        **aggregator_config,
    )
    return {
        "aggregator_type": aggregator_type,
        "environment_signal": doc_metadata["environment_signal"],
        "summary": doc_metadata["summary"],
        "mechanism": doc_metadata["mechanism"],
        "formula_readable": doc_metadata["formula_readable"],
        "formula_code": doc_metadata["formula_code"],
        "formula_settings": _build_aggregator_formula_settings(
            aggregator_type, aggregator
        ),
        "sensor_sync": doc_metadata["sensor_sync"],
        "unit": aggregator.unit,
        "baseline_value": aggregator.baseline_value,
        "current_value": aggregator.current_value,
        "interested_device_types": aggregator.interested_device_types,
        "implementation": _implementation_info(aggregator),
        "source": "aggregator_registry",
    }


def _build_aggregator_summary(aggregator_type: str) -> dict[str, Any]:
    payload = _build_aggregator_payload(aggregator_type)
    return {
        "aggregator_type": payload["aggregator_type"],
        "environment_signal": payload["environment_signal"],
        "summary": payload["summary"],
        "unit": payload["unit"],
        "baseline_value": payload["baseline_value"],
        "current_value": payload["current_value"],
        "interested_device_types": payload["interested_device_types"],
    }


def _build_aggregator_formula_settings(
    aggregator_type: str, aggregator: Any
) -> list[dict[str, Any]]:
    baseline_value = aggregator.baseline_value
    current_value = aggregator.current_value
    tick_interval = aggregator.tick_interval

    if aggregator_type == "temperature":
        return [
            {
                "name": "tick_interval",
                "value": tick_interval,
                "description": (
                    "Simulation tick duration used by the aggregator update loop."
                ),
            },
            {
                "name": "delta",
                "value": baseline_value - current_value,
                "description": (
                    "Current restoration gap computed as baseline_value - current_value."
                ),
            },
            {
                "name": "restoration_rate_per_second",
                "value": 0.0002,
                "description": "Passive return speed toward the baseline temperature.",
            },
            {
                "name": "hvac_rate_cap_per_second_c",
                "value": 0.0005,
                "description": (
                    "Per-second cap for HVAC heating or cooling before tick scaling."
                ),
            },
            {
                "name": "fan_rate_cap_per_second_c",
                "value": 0.0002,
                "description": (
                    "Per-second cap for fan-only cooling before tick scaling."
                ),
            },
        ]

    if aggregator_type == "pm10":
        concentration_ratio = 1.0
        if baseline_value > 0:
            concentration_ratio = current_value / baseline_value
        pollution_factor = (
            concentration_ratio * 0.8
            if concentration_ratio > 2.0
            else min(2.0, concentration_ratio)
        )
        return [
            {
                "name": "tick_interval",
                "value": tick_interval,
                "description": (
                    "Simulation tick duration used by the aggregator update loop."
                ),
            },
            {
                "name": "restoration_delta",
                "value": baseline_value - current_value,
                "description": (
                    "Current restoration gap computed as baseline_value - current_value."
                ),
            },
            {
                "name": "restoration_rate_per_second",
                "value": 0.1,
                "description": "Passive return speed toward the baseline PM10 level.",
            },
            {
                "name": "base_rate_per_second",
                "value": 5.0,
                "description": (
                    "Base purifier effect before fan intensity and pollution scaling."
                ),
            },
            {
                "name": "concentration_ratio",
                "value": concentration_ratio,
                "description": "Current PM10 concentration divided by the baseline.",
            },
            {
                "name": "pollution_factor",
                "value": pollution_factor,
                "description": "Extra scaling applied when pollution is above baseline.",
            },
        ]

    if aggregator_type == "illuminance":
        return [
            {
                "name": "baseline_value",
                "value": baseline_value,
                "description": "Ambient illuminance present before any light is active.",
            },
            {
                "name": "current_value",
                "value": current_value,
                "description": "Default aggregated illuminance loaded from the registry.",
            },
            {
                "name": "on_off_light_contribution_lux",
                "value": 500.0,
                "description": "Fixed lux contribution for an active on/off light.",
            },
            {
                "name": "dimmable_light_max_contribution_lux",
                "value": 500.0,
                "description": (
                    "Maximum lux contribution when a dimmable light is at level 254."
                ),
            },
        ]

    if aggregator_type == "humidity":
        return [
            {
                "name": "tick_interval",
                "value": tick_interval,
                "description": (
                    "Simulation tick duration used by the aggregator update loop."
                ),
            },
            {
                "name": "delta",
                "value": baseline_value - current_value,
                "description": (
                    "Current restoration gap computed as baseline_value - current_value."
                ),
            },
            {
                "name": "restoration_rate_per_second",
                "value": 0.01,
                "description": "Passive return speed toward the baseline humidity.",
            },
            {
                "name": "base_rate_per_second",
                "value": 5.0,
                "description": (
                    "Base humidifying or dehumidifying effect before efficiency scaling."
                ),
            },
            {
                "name": "humidifier_ceiling",
                "value": 9000,
                "description": (
                    "Humidifiers stop adding moisture once humidity reaches this level."
                ),
            },
            {
                "name": "dehumidifier_floor",
                "value": 1000,
                "description": (
                    "Dehumidifiers stop removing moisture once humidity reaches this level."
                ),
            },
        ]

    return []


def _command_args(commands: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for command_name, command in commands.items():
        args: list[dict[str, Any]] = []
        for param_name, param in signature(command).parameters.items():
            annotation = param.annotation
            annotation_name = (
                annotation.__name__
                if hasattr(annotation, "__name__")
                else str(annotation)
                if annotation is not param.empty
                else "Any"
            )
            args.append(
                {
                    "name": param_name,
                    "type": annotation_name,
                    "required": param.default is param.empty,
                    "default": None if param.default is param.empty else param.default,
                }
            )
        result[command_name] = args
    return result


def _implementation_info(instance: object) -> dict[str, str | None]:
    instance_type = type(instance)
    source_file = inspect.getsourcefile(instance_type)
    return {
        "class_name": instance_type.__name__,
        "module": instance_type.__module__,
        "source_file": source_file,
    }


def _public_metadata(
    instance: object,
    *,
    excluded: set[str],
) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    for key, value in vars(instance).items():
        if key.startswith("_") or key in excluded or callable(value):
            continue

        normalized = _normalize_value(value)
        if normalized is not None:
            metadata[key] = normalized

    return metadata


def _normalize_value(value: Any, *, _depth: int = 0) -> Any:
    if _depth > 4:
        return repr(value)
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, Enum):
        return {
            "enum": value.__class__.__name__,
            "name": value.name,
            "value": value.value,
        }
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        normalized = {
            str(key): _normalize_value(item, _depth=_depth + 1)
            for key, item in value.items()
        }
        return {key: item for key, item in normalized.items() if item is not None}
    if isinstance(value, list | tuple | set):
        return [
            item
            for item in (
                _normalize_value(item, _depth=_depth + 1) for item in value
            )
            if item is not None
        ]
    if isinstance(value, Cluster | Device):
        return {
            "class_name": type(value).__name__,
            "module": type(value).__module__,
        }
    if inspect.isclass(value):
        return value.__name__
    if callable(value):
        return None
    if hasattr(value, "__dict__"):
        return repr(value)
    return value


def _cluster_doc_path(cluster_id: str) -> str | None:
    aliases = {
        "OnOff": "On_Off_Cluster.md",
        "LevelControl": "Level_Control_Cluster.md",
        "TemperatureControl": "Temperature_Control_Cluster.md",
    }
    candidates = [
        aliases.get(cluster_id, f"{cluster_id}_Cluster.md"),
        f"{cluster_id.replace(' ', '_')}_Cluster.md",
    ]
    for filename in candidates:
        candidate = DOCS_ROOT / filename
        if candidate.exists():
            return str(candidate)
    return None
