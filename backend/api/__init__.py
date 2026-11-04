"""Backend API (seam 1) and HTTP layer (Track D, Task 7, ADR-015).

The eight C-28 service functions, the submit orchestration, and a transport-agnostic HTTP
router. Built in Python to match the backend language decision (ADR-015). Consumes the pure
domain core (`shared/core`, Track B) and the store seam (`backend/store`, seam 4), and the
model/safety seam (Track C) through an injected port so it runs end to end on stubs today.
"""
