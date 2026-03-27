from __future__ import annotations

import inspect
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
AGGREGATOR_WIKI_METADATA: dict[str, dict[str, str]] = {
    "temperature": {
        "environment_signal": "Temperature",
        "summary": "Tracks room temperature from HVAC and air movement devices.",
        "mechanism": (
            "Uses heat exchange from active HVAC devices and passive restoration "
            "toward the baseline temperature."
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


def build_api_catalog(routes: list[Any]) -> dict[str, Any]:
    catalog: list[dict[str, Any]] = []
    for route in routes:
        if not isinstance(route, APIRoute):
            continue
        if not route.path.startswith("/api"):
            continue

        methods = sorted(method for method in route.methods or [] if method != "HEAD")
        for method in methods:
            catalog.append(
                {
                    "method": method,
                    "path": route.path,
                    "name": route.name,
                    "summary": (route.endpoint.__doc__ or "").strip() or None,
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
