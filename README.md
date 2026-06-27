# SMTinel / TraceOps Live

SMTinel is a local-first manufacturing intelligence workspace for SMT production. TraceOps Live converts operational messages and production events into structured incidents, timelines, alerts, and dashboard-ready JSON feeds.

The repository also includes the static SMTinel dashboard experience, reusable Yield Flow React components, demo pages, and supporting manufacturing reference files.

## Repository Layout

```text
api/            FastAPI application and REST endpoints
assets/         Public dashboard media and visual assets
components/     Reusable React components
config/         Runtime settings and logging configuration
correlation/    Incident clustering and timeline logic
data/           Local runtime data placeholder
demo/           Static demo prototype files
docs/           Guides, technical notes, archives, and datasheets
examples/       Component usage examples
export/         JSON export and optional sync adapters
frontend/       Static frontend reference build
main/icons/     Desktop/app icon assets
modules/        Standalone local-first operational modules
parser/         Manufacturing message parser
schemas/        Pydantic event and alert schemas
sentinel/       Severity and alert scoring
storage/        SQLite ingestion and incident memory
tests/          Parser tests
```

## Local Modules

| Module | Path | Purpose |
| --- | --- | --- |
| Scheduling Optimizer | `modules/scheduling-optimizer.html` | Sequencing simulator for SMT orders using SPT, EDD, CR, WSPT, family batching, and hybrid priority logic. Includes Gantt view, KPI comparison, tardiness, setup, utilization, and CSV export. |

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env
python pipeline_orchestrator.py
```

Run the API server:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8081
```

## Configuration

All runtime settings can be overridden with environment variables. Start from `.env.example` and adjust local paths as needed:

```env
TRACEOPS_DB_PATH=./data/traceops_live.db
WHATSAPP_DB_PATH=../whatsapp-bridge/store/messages.db
TRACEOPS_API_HOST=127.0.0.1
TRACEOPS_API_PORT=8081
TRACEOPS_POLL_INTERVAL=5.0
TRACEOPS_BATCH_SIZE=50
TRACEOPS_CORR_WINDOW=30
TRACEOPS_CORR_MIN=2
TRACEOPS_AUTO_ALERTS=false
TRACEOPS_SUPABASE=false
```

## API Surface

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Health check |
| `/status` | GET | System status and component metrics |
| `/incidents` | GET | List incidents with filters |
| `/incidents/{id}` | GET | Incident detail |
| `/incidents/{id}/status` | POST | Update incident status |
| `/alerts` | GET | Alert feed |
| `/timelines/{id}` | GET | Incident timeline |
| `/export` | POST | Export package to JSON |
| `/stats` | GET | Pipeline statistics |
| `/ingest/poll` | POST | Manual ingestion trigger |

## Notes

- Runtime logs and local databases are ignored by Git; `data/.gitkeep` and `logs/.gitkeep` keep the folders visible.
- PDF references live in `docs/datasheets/`.
- Legacy bundles and text exports live in `docs/archive/`.
- The public dashboard entry point remains `index.html` at the repository root for GitHub Pages compatibility.

## License

MIT
