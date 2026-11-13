# Intelligence layer

Analytical and ML capability built on gold: entity resolution across
registries, similarity and matching, risk scoring, enrichment and
signal detection.

Conventions:

- Models are trained and tracked with MLflow; production models are
  registered in Unity Catalog.
- Model training notebooks live beside their feature definitions.
- Every scored output lands back in a governed table — never a
  side-channel export.

No intelligence workloads exist yet; document each (purpose, inputs,
model, output table) here as it is introduced.
