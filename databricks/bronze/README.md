# Bronze — raw records

Immutable, append-only, source-faithful. Bronze tables keep exactly
what ingestion landed, plus audit columns (`_ingested_at`,
`_source`, `_batch_id`). Nothing is deleted or updated here; corrections
flow downstream.

Bronze tables are written by SDP streaming tables, one per source
feed, partitioned by ingest date where volumes justify it.

No bronze tables exist yet; document each table (name, source, load
cadence) here as it is created.
