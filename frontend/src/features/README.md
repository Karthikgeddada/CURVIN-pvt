# Features

Each CURVIN capability (Company Search, Company Intelligence, Market
Intelligence, and so on) is an independent module under this directory:

```
src/features/<feature-name>/
├── components/   # Feature-scoped UI
├── hooks/        # Feature-scoped state and data access
└── index.ts      # Public API of the feature
```

A feature module never imports from another feature module — shared UI
lives in `src/shared`, shared clients in `src/core`. Pages under
`src/pages` compose feature modules; routes are registered centrally in
`src/app/router.tsx`.

No features are implemented at this milestone. Do not add placeholder
files here.
