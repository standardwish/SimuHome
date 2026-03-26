from __future__ import annotations

from typing import Sequence

from src.agents.types import ChatMessage
from src.pipelines.episode_evaluation.common import run_judge_panel
from src.pipelines.episode_evaluation.qt1 import feasible


class RaisingJudge:
    def __init__(self, message: str) -> None:
        self.message = message

    def generate(
        self,
        messages: Sequence[ChatMessage],
        response_format=None,
    ) -> str:
        raise RuntimeError(self.message)


def test_run_judge_panel_returns_error_details_for_failed_judges() -> None:
    result = run_judge_panel(
        [
            RaisingJudge("judge one failed"),
            RaisingJudge("judge two failed"),
            RaisingJudge("judge three failed"),
        ],
        "system",
        "user",
    )

    assert result["score"] == -1
    assert result["error_type"] == "Judge Error"
    assert result["judge"] == ["Error", "Error", "Error"]
    assert result["judge_error_details"] == [
        "judge one failed",
        "judge two failed",
        "judge three failed",
    ]


def test_qt1_feasible_evaluation_includes_judge_error_details() -> None:
    payload = {
        "episode": {
            "query": "How bright is the utility room and bathroom?",
            "eval": {
                "goals": {"utility_room": "bright", "bathroom": "dim"},
                "required_actions": [
                    {"tool": "get_room_states", "params": {"room_id": "utility_room"}},
                    {"tool": "get_room_states", "params": {"room_id": "bathroom"}},
                ],
            },
        },
        "tools_invoked": [
            {
                "tool": "get_room_states",
                "params": {"room_id": "utility_room"},
                "outcome": {"ok": True, "status_code": 200, "error_type": None},
            },
            {
                "tool": "get_room_states",
                "params": {"room_id": "bathroom"},
                "outcome": {"ok": True, "status_code": 200, "error_type": None},
            },
        ],
        "steps": [
            {
                "step": 1,
                "thought": "Check utility room.",
                "action": "get_room_states",
                "action_input": {"room_id": "utility_room"},
                "observation": {"data": {"illuminance": 681.81}},
            },
            {
                "step": 2,
                "thought": "Check bathroom.",
                "action": "get_room_states",
                "action_input": {"room_id": "bathroom"},
                "observation": {"data": {"illuminance": 100.0}},
            },
            {
                "step": 3,
                "thought": "Answer.",
                "action": "finish",
                "action_input": {"answer": "Utility room is bright; bathroom is dim."},
                "observation": None,
            },
        ],
    }

    result = feasible.evaluate(
        payload,
        [
            RaisingJudge("judge one failed"),
            RaisingJudge("judge two failed"),
            RaisingJudge("judge three failed"),
        ],
    )

    assert result["score"] == -1
    assert result["error_type"] == "Judge Error"
    assert result["judge"] == ["Error", "Error", "Error"]
    assert result["judge_error_details"] == [
        "judge one failed",
        "judge two failed",
        "judge three failed",
    ]
