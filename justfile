# Expense Guard — common recipes
set dotenv-load := true

host := env("EVE_HOST", "http://127.0.0.1:2000")
fixture := env("POC_REQUEST_FILE", "fixtures/ambiguous.json")

# Install dependencies
install:
    bun install

# Build the agent
build:
    bunx eve build

# Run the agent locally (POST /eve/v1/review)
dev: build
    bunx eve dev

# Run the eval suite
evals:
    bunx eve eval

alias eval := evals

# Deterministic Vitest suite (schema + HTTP 400 when just dev is up)
test:
    bun run test

# POST a review using a fixture file (default: fixtures/ambiguous.json)
# Usage:
#   just review
#   just review fixtures/valid.json
#   just review fixtures/cross-company.json
review file=fixture:
    curl --fail-with-body --location '{{host}}/eve/v1/review' \
      --header 'Content-Type: application/json' \
      --data @{{file}}

# List available fixtures
fixtures:
    ls -1 fixtures/*.json
