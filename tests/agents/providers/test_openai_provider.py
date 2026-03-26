from __future__ import annotations

from types import SimpleNamespace

import pytest

from src.agents.providers.openai_provider import OpenAIChatProvider
from src.agents.types import ChatMessage


class FakeAPIStatusError(Exception):
    def __init__(self, message: str, *, status_code: int, body: dict | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body


def _response_with_content(content: str) -> SimpleNamespace:
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


def test_generate_omits_temperature_for_known_unsupported_models(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    captured_kwargs: list[dict] = []

    class FakeCreate:
        def __call__(self, **kwargs):
            captured_kwargs.append(kwargs)
            return _response_with_content("A")

    monkeypatch.setattr("src.agents.providers.openai_provider.OpenAI", lambda **_: None)

    provider = OpenAIChatProvider(
        model="gpt-5-mini",
        temperature=0.0,
        api_key="test-key",
        api_base="https://api.openai.com/v1",
    )
    provider._client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=FakeCreate()))
    )

    result = provider.generate([ChatMessage(role="user", content="judge this")])

    assert result == "A"
    assert "temperature" not in captured_kwargs[0]
    assert "gpt-5-mini does not support the temperature parameter" in caplog.text


def test_generate_retries_without_temperature_after_unsupported_value_error(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    calls: list[dict] = []

    class FakeCreate:
        def __call__(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                raise FakeAPIStatusError(
                    "unsupported temperature",
                    status_code=400,
                    body={
                        "error": {
                            "message": (
                                "Unsupported value: 'temperature' does not support 0.0 "
                                "with this model. Only the default (1) value is supported."
                            ),
                            "type": "invalid_request_error",
                            "param": "temperature",
                            "code": "unsupported_value",
                        }
                    },
                )
            return _response_with_content("B")

    monkeypatch.setattr(
        "src.agents.providers.openai_provider.APIStatusError", FakeAPIStatusError
    )
    monkeypatch.setattr("src.agents.providers.openai_provider.OpenAI", lambda **_: None)
    monkeypatch.setattr("src.agents.providers.openai_provider.time.sleep", lambda *_: None)

    provider = OpenAIChatProvider(
        model="custom-model",
        temperature=0.0,
        api_key="test-key",
        api_base="https://api.openai.com/v1",
        max_retries=0,
    )
    provider._client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=FakeCreate()))
    )

    result = provider.generate([ChatMessage(role="user", content="judge this")])

    assert result == "B"
    assert len(calls) == 2
    assert calls[0]["temperature"] == 0.0
    assert "temperature" not in calls[1]
    assert "Retrying request without temperature." in caplog.text
