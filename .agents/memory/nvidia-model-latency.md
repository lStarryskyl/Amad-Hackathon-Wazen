---
name: NVIDIA model latency gotcha
description: Some integrate.api.nvidia.com models hang indefinitely (0 bytes); always latency-test before wiring a model in
---
# NVIDIA hosted model latency

**Rule:** Before pointing `AI_MODEL` at an NVIDIA-hosted model, curl-test `POST /chat/completions` with a tiny prompt and a 15s cap. Some catalog models accept the connection but never respond — 0 bytes even with streaming, valid key, and the exact catalog model ID.

**Why:** July 2026: `z-ai/glm-5.2` hung on every request (270s, 0 bytes, even for "say hello") while `meta/llama-3.1-70b-instruct` answered in ~5s on the same key + endpoint. Every app AI feature timed out with no distinguishing error, which looked like an app bug. `meta/llama-3.3-70b-instruct` and nemotron-super-49b were also slow/empty that day — availability varies per model.

**How to apply:** Two-step probe: `GET /v1/models` proves the key and exact model IDs; a capped chat call proves the model actually serves. Also: reasoning/"thinking" models burn completion budget on hidden reasoning — this app's AI calls use small max_tokens (10–350), so prefer plain instruct models or raise budgets deliberately.
