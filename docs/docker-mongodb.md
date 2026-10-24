# Docker and MongoDB

The Compose stack runs the React build and Python/FastAPI API together, backed by MongoDB 7. Docker Desktop must be running with Linux containers.

## Start

```sh
docker compose up -d --build app
docker compose ps
```

Open http://localhost:3001. The project name is `aeris`, so these commands manage the same stack regardless of the checkout folder name. CI overrides it with its isolated `aeris-ci` project.

Startup order is deliberate:

1. `mongo` starts with a persistent named volume and passes its ping health check.
2. `seed` imports the real Elexon snapshot through Python and exits successfully.
3. `app` starts, loading its analytical data from MongoDB through PyMongo.

The application image builds React with Node, then runs FastAPI as a non-root Python user. It has an HTTP health check. MongoDB has no published host port; the app and seed use the private Compose network.

## Verify

http://localhost:3001/api/health must report `storage: MongoDB` and `backend: Python / FastAPI`.

```sh
docker compose exec -T app python -m scripts.verify_deployment
docker compose run --rm seed
docker compose exec -T mongo mongosh aeris --quiet --eval 'JSON.stringify({forecasts:db.forecasts.countDocuments({}),actuals:db.actuals.countDocuments({}),metadata:db.metadata.countDocuments({})})'
```

Expected counts for the checked-in snapshot: **18,688 forecasts, 1,536 actuals, and 1 metadata document**. Repeating the seed preserves counts through unique source-key indexes and upserts. Verification checks MongoDB storage, API metrics, Decision Lab replay, brief identity, and the served React page against the reference snapshot.

## Operate

```sh
docker compose logs --tail 50 app seed
docker compose stop
docker compose start mongo app
```

`docker compose down` removes this stack's containers/network while retaining the database volume. Restart the app after intentionally refreshing/reseeding data because this fixed January pilot caches its analytical snapshot in process. Other Docker projects are independent.

## Public app and Atlas

The public Vercel deployment now reads from **MongoDB Atlas** and its health endpoint reports **MongoDB**. The URI is stored as a hidden production Secret. Two seed runs preserved 18,688 forecasts, 1,536 actuals, and one metadata document, with unique source-key indexes. Staged and public API checks passed for numerical metrics, Decision Lab replay, and brief identity. The local Docker database is independent of Atlas. Never put the connection string in the repository or a `VITE_*` variable.

The same PyMongo repository/seed code supports both databases; no backend rewrite is required. After any database configuration change, redeploy and verify that the public health endpoint still reports MongoDB. Without a configured URI, local development can use the bundled snapshot.
