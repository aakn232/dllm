import pytest
import json
import asyncio
from backend.routers.chat import stream_nvidia_response

class MockResponse:
    def __init__(self, lines):
        self.lines = lines

    async def aiter_lines(self):
        for line in self.lines:
            yield line

    async def aclose(self):
        pass

def test_stream_nvidia_response_thinking():
    async def _run():
        mock_chunks = [
            {"choices": [{"delta": {"content": "Hello! <thinking>I need to solve a complex mathematical problem step-by-step."}}]},
            {"choices": [{"delta": {"content": " First, add 2 and 2 to get 4.</thinking> The result is 4."}}]},
        ]
        
        lines = [f"data: {json.dumps(chunk)}" for chunk in mock_chunks] + ["data: [DONE]"]
        mock_resp = MockResponse(lines)

        events = []
        async for event in stream_nvidia_response(mock_resp, enable_thinking=True):
            if event.startswith("data: "):
                payload = event[6:].strip()
                if payload != "[DONE]":
                    events.append(json.loads(payload))

        content_events = [e for e in events if e.get("type") == "content"]
        thinking_events = [e for e in events if e.get("type") in ("thinking", "thinking_stream")]

        full_content = "".join([e["delta"] for e in content_events])
        full_thinking = "".join([e["delta"] for e in thinking_events])

        assert full_content == "Hello!  The result is 4."
        assert "I need to solve a complex mathematical problem step-by-step." in full_thinking
        assert "First, add 2 and 2 to get 4." in full_thinking

    asyncio.run(_run())

def test_stream_nvidia_response_empty_thinking():
    async def _run():
        mock_chunks = [
            {"choices": [{"delta": {"content": "Greeting <thinking></thinking>World!"}}]}
        ]
        lines = [f"data: {json.dumps(chunk)}" for chunk in mock_chunks] + ["data: [DONE]"]
        mock_resp = MockResponse(lines)

        events = []
        async for event in stream_nvidia_response(mock_resp, enable_thinking=True):
            if event.startswith("data: "):
                payload = event[6:].strip()
                if payload != "[DONE]":
                    events.append(json.loads(payload))

        content_events = [e for e in events if e.get("type") == "content"]
        thinking_events = [e for e in events if e.get("type") in ("thinking", "thinking_stream")]

        full_content = "".join([e["delta"] for e in content_events])
        
        assert full_content == "Greeting World!"
        assert len(thinking_events) == 0

    asyncio.run(_run())

def test_apply_thinking_instruction_enabled():
    from backend.routers.chat import apply_thinking_instruction
    messages = [{"role": "user", "content": "안녕하세요"}]
    res = apply_thinking_instruction(messages, enable_thinking=True)
    assert res[0]["role"] == "system"
    assert "사고 모드 (Thinking Mode) 활성화" in res[0]["content"]
    assert "<thinking>" in res[0]["content"]

def test_apply_thinking_instruction_disabled():
    from backend.routers.chat import apply_thinking_instruction
    messages = [{"role": "user", "content": "안녕하세요"}]
    res = apply_thinking_instruction(messages, enable_thinking=False)
    assert res[0]["role"] == "system"
    assert "사고 모드 (Thinking Mode) 비활성화" in res[0]["content"]

def test_apply_thinking_instruction_with_existing_system():
    from backend.routers.chat import apply_thinking_instruction
    messages = [
        {"role": "system", "content": "너는 친절한 AI 조수이다."},
        {"role": "user", "content": "안녕하세요"}
    ]
    res = apply_thinking_instruction(messages, enable_thinking=True)
    assert res[0]["role"] == "system"
    assert "너는 친절한 AI 조수이다." in res[0]["content"]
    assert "사고 모드 (Thinking Mode) 활성화" in res[0]["content"]

def test_stream_nvidia_response_reasoning_field():
    async def _run():
        mock_chunks = [
            {"choices": [{"delta": {"reasoning": "<|channel>thought* Step 1: Analyze problem."}}]},
            {"choices": [{"delta": {"reasoning": " Step 2: Solve it."}}]},
            {"choices": [{"delta": {"content": "Answer is 42."}}]}
        ]
        lines = [f"data: {json.dumps(chunk)}" for chunk in mock_chunks] + ["data: [DONE]"]
        mock_resp = MockResponse(lines)

        events = []
        async for event in stream_nvidia_response(mock_resp, enable_thinking=True):
            if event.startswith("data: "):
                payload = event[6:].strip()
                if payload != "[DONE]":
                    events.append(json.loads(payload))

        content_events = [e for e in events if e.get("type") == "content"]
        thinking_events = [e for e in events if e.get("type") in ("thinking", "thinking_stream")]

        full_content = "".join([e["delta"] for e in content_events])
        full_thinking = "".join([e["delta"] for e in thinking_events])

        assert full_content == "Answer is 42."
        assert "* Step 1: Analyze problem. Step 2: Solve it." in full_thinking
        assert "<|channel>" not in full_thinking

    asyncio.run(_run())

