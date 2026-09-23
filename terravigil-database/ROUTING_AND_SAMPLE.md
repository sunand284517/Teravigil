# Sample records and route interpretation

The integrated launcher seeds SAMPLE-TV001 into the persistent database once: four confirmed synthetic examples, four unconfirmed synthetic observations, and twenty recorded telemetry points. Sample locations and sensor readings are fictional. The sample is read-only source data, but now uses the real indexing, retrieval, assistant and report services.

The original database-free sample server remains in source only as a legacy test fixture. It is not the application started by npm start and should not be used to evaluate integrated AI or reports.

The solid path joins chronological flight telemetry; Flight start and Flight end identify its endpoints. The dashed calculated route connects Route A to Route B. The latter uses the existing bounded A* engine and recorded hazard-point exclusions. Geometry changes with endpoints, evidence and preferences; the zigzag is not a required final mission shape. Satellite pixels, buildings and terrain are not parsed by this planner.

See backend/routing/README.md for algorithm bounds and failure behavior.
