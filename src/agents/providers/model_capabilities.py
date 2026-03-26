from __future__ import annotations


TEMPERATURE_UNSUPPORTED_MODELS = frozenset(
    {
        "gpt-5-mini",
    }
)


def normalize_model_name(model: str) -> str:
    normalized = (model or "").strip().lower()
    if "/" in normalized:
        normalized = normalized.rsplit("/", 1)[-1]
    return normalized


def supports_temperature_parameter(model: str) -> bool:
    return normalize_model_name(model) not in TEMPERATURE_UNSUPPORTED_MODELS
