# Current integration review

This ZIP supersedes the earlier sample-only version. The original default launcher, deterministic sample chat and disabled report adapter have been replaced in the integrated path.

- The exact supplied best.pt now runs through the Python inference service and Model inference page.
- Persistent sample and uploaded mission records reach real MiniLM retrieval and Gemini generation; source citations are returned.
- PDF/CSV reporting produces immutable downloadable editions and includes inference runs even when GPS is absent.
- Flight track endpoints and calculated route endpoints are separately labeled.
- Storage defaults to a local persistent database; MongoDB is optional.

A working Gemini key remains required. Live physical sensors, flight control, target geolocation and TensorRT deployment were not supplied or validated. See START_HERE.md and VERIFICATION.md for current setup and evidence.
