# TerraVigil 3.0 verification

Verified on 23 September 2026 in Linux with Node.js 24.19.0 and Python 3.12. The integrated application is now the default launcher.

| Check | Executed result |
| --- | --- |
| Backend suite | **101 passed, 0 failed, 0 skipped**, including the opt-in real-checkpoint test |
| Frontend suite | **148 passed**, including actual component events for inference upload, mission selection, report generation, citations and route/map behavior |
| Python suite | **11 passed** for checkpoint identity, image validation, coordinate/box outputs and the JSON protocol |
| Source/build | TypeScript, ESLint and frontend build passed. Built UI is included |
| Packaged startup | Root launcher served the compiled model page, SPA deep link and integrated health API |
| Actual model execution | The exact supplied best.pt loaded on CPU. An HTTP upload of the included 1920×1100 validation montage produced **3 predictions** and a **594,792-byte annotated image** |
| Actual retrieval | MiniLM executed locally, producing a **319-chunk** index for SAMPLE-TV001. A query naming SAMPLE-TV001-D001 retrieved that exact detection first, with its real semantic score and explicit exact-ID retrieval method |
| Image-to-report workflow | The same inference run persisted in a separate mission. RAG documents and embeddings included its predictions. PDF and CSV reported 1 image run, 3 predictions and 3 unlocalized predictions without adding confirmed observations |
| Report downloads | Actual HTTP generation/download succeeded for sample and image-only missions. PDF signatures, CSV contents and record counts checked; PDF layout and citation tables visually reviewed |
| Persistence | A reopened local database retained the inference run and both report editions |
| Dynamic routing | Integrated HTTP route computation returned a path for the sample endpoints. Regressions refuse unsupported coordinates and unlocalized image evidence |
| LLM transport | Request/response, timeouts and error mapping tested with a controlled provider response. Missing-key assistant and AI-report requests returned GEMINI_NOT_CONFIGURED; no fixture answer was substituted |
| Review fixes | Image-location provenance preserved; synthetic provenance retained in summary context; factual and AI narrative citation inventories separated |

The montage already contains training-validation labels. Its successful execution is a runtime smoke test, **not an accuracy evaluation**. All sample records remain explicitly synthetic.

## Reproduce

After the setup described in START_HERE.md:

```sh
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm run build
npm run doctor
```

For the real checkpoint backend test, set `INFERENCE_REAL_TEST=1`, `INFERENCE_PYTHON` to the configured Python executable and `INFERENCE_TEST_IMAGE` to the absolute path of `examples/validation-montage.jpg`, then run the backend tests. The normal test run skips this explicitly opt-in check. Python tests: `python -m unittest discover -s inference/tests -v` using the configured environment.

## Limits of verification

- No Gemini key was supplied. Authenticated Gemini output, account quota and model availability were **not** verified. Set the key in backend/.env and run `npm run doctor` or `npm --prefix backend run check:gemini`. Both report failures rather than claiming readiness. No credential is included in the ZIP.
- This update's full browser smoke could not run: the browser download was unusable and an alternate Chromium binary exited before opening a page. The UI was verified through component integration tests, TypeScript/build and real HTTP contracts; this is not a claim of a successful browser run.
- Windows/macOS installers and a real MongoDB server were not exercised. CPU model execution and durable local storage were verified on Linux. Setup supports the pinned Node/Python versions described in START_HERE.md.
- No drone, metal detector, radio, autonomous flight controller, field location accuracy or field detection accuracy was tested or added. Image inference alone does not confirm a mine or locate its exact ground position. The route is advisory recorded-point geometry.
- Satellite imagery requires provider/network availability; the existing offline grid remains available. Vite's large-bundle warning is nonfatal.

Older notes under frontend/docs are historical. This is the verification record for the delivered integrated package.
