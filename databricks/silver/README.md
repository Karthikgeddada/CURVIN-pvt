# Silver — conformed entities

Cleaned, deduplicated and conformed. Silver holds the canonical
entity model: companies, registrations, filings, market instruments,
news events — normalized and keyed.

Every silver table is a materialized view or streaming table with
SDP **expectations** enforcing data quality (required keys, valid
dates, controlled vocabularies). Quarantined records are counted and
alerted, never silently dropped.

No silver tables exist yet; document each entity (grain, keys,
expectations) here as it is created.
