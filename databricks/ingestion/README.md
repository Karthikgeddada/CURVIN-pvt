# Ingestion

Land raw data from external sources into the lakehouse.

Sources will include company registries, filings feeds, market data
providers and news/event streams. Preferred mechanisms, in order:

1. **Lakeflow Connect** managed pipelines where a connector exists.
2. **Auto Loader** (`read_files` / streaming tables) for file drops in
   cloud storage or UC volumes.
3. Batch loads for full-snapshot providers.

Ingestion never transforms — it lands bytes as received, with source,
load timestamp and batch identifiers attached. Transformation begins
in `bronze/`.

No ingestion pipelines exist yet; add each as a concrete SDP notebook
with its source documented here when introduced.
