# Publication and verification record

## Current deliverable

- Stack: React frontend and Python/FastAPI backend. All ingestion, analysis, database access, and exports are Python.
- Visual reference: GridBricks by REint at https://reint.ai/; independent assessment branding and original implementation.
- Public source: https://github.com/Hargun1/bbc7a6fdf5f9.
- Public Vercel app: **https://aeris-bbc7a6fdf5f9.vercel.app**. Verified without login; the backend reports Python/FastAPI. Storage is MongoDB Atlas, seeded with the real Elexon snapshot.
- YouTube: the requester chose to record/upload the prepared script. No video URL yet.
- Form: not submitted. The assignment explicitly requires the video first.

## Verification evidence

- 55 Python tests passed locally: analytics, causal history, time boundaries, ingestion validation/conflicts, API validation, revision audit, CSV, common-cohort comparison, chronological risk evaluation, and future-actual isolation of decision briefs.
- React production build passed.
- Local Docker Desktop stack verified on 24 October 2026: `aeris-app-1` serves React/Python at http://localhost:3001 with `storage: MongoDB`; `aeris-mongo-1` passes its health check. Seeding twice preserved 18,688 forecast records, 1,536 actuals, and 1 metadata document. The MongoDB-backed API passed metrics, Decision Lab replay, brief identity, and frontend checks. The named volume retained data through MongoDB container recreation. See `docs/docker-mongodb.md`.
- Migration parity passed for every monthly output and 124 decision-day profiles across all four cutoffs.
- Local FastAPI health returned HTTP 200 with `backend: Python / FastAPI` and `storage: Bundled Elexon snapshot`.
- `docker compose config --quiet` passed. [Python CI run 40112420641](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40112420641) passed for commit `e64d8a9`: all 31 tests, React build, Docker/Python/MongoDB startup, repeat seed, and API parity.
- Release 2.1 source `6c97bfb` adds Decision Lab: revision comparison, common-cohort policy evaluation, P80/P90/P95 chronological replay, 744-cell error atlas, and portable as-of briefs.
- [Release CI run 40116915696](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40116915696) completed successfully for source `6c97bfb`: 55 Python tests, React build, Docker/Python/MongoDB startup, repeat seed, MongoDB-backed API metrics, Decision Lab replay, brief parity, and frontend response.
- Vercel Atlas-backed production deployment `dpl_6EVGGMAwJZrm9CYEED1pV6HrKRXV` reached READY and was promoted after staged checks. Vercel used Python 3.13 for the API function. Public health confirms version `2.1.0`, Python/FastAPI, and `storage: MongoDB`.
- Unauthenticated production checks passed for the root HTML, Python health, monthly metrics, daily profile, revisions, CSV export (744 rows), API docs, and invalid date (400). Production responses match local reference calculations.
- Atlas release source `11ab6ad` passed [CI run 40118053377](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40118053377). Atlas connection/authentication, two seed runs, exact document counts, unique indexes, repository loading, and monthly metric parity passed. The URI is a hidden production Secret and the ignored local credential file remains outside Git, Docker context, and Vercel uploads.
- Atlas-backed staged and public checks passed for MongoDB health, metrics, Decision Lab replay, brief identity, and frontend response. Public checks also passed for 744-row CSV export, printable P95 brief, API docs, and HTTP 400 input validation; the URI was absent from the browser HTML/main bundle.
- New staged checks passed at P80, P90, and P95; public checks confirmed replay/brief parity and the script-free HTML attachment. The Jan 15/P95 brief has ID `abdf8c541b4d461e`.
- Deployment-specific/team-preview URLs retain Vercel protection. Use the public production hostname above for submission.
- Production runtime-error scan returned zero records for the recent five-minute verification window. No external log drain or alerting setup was added.
- Repository and raw README were accessible via unauthenticated HTTP 200.
- Browser automation is unavailable in this session; visual layout and incognito checks are not claimed complete.

## Vercel agent setup

Following https://vercel.com/get-started.md:

- Global Vercel CLI 65.2.0 installed and authenticated as `hargun1`.
- Existing Vercel plugin verified installed; no duplicate standalone skill pack installed.
- Global Codex MCP entry `vercel` added at exactly `https://mcp.vercel.com`, preserving other servers. OAuth completed successfully.
- MCP account tools have not loaded into this existing chat; a refreshed/new Codex session is needed to use those tools. Deployment uses the authenticated CLI in this session.
- No credentials or Vercel environment files are tracked in Git.

## Finish the submission

1. Use the verified public production URL above and the public repository URL.
2. Record the real app and technical walkthrough from `demo-script.md`; keep the whole video at most ten minutes and each initial overview at most five.
3. Upload to YouTube as Unlisted and verify playback/sound.
4. Open the exact app, repository, and video URLs in incognito while signed out. Verify app/API access, readable source, and video playback without requesting access.
5. Enter the real URLs and applicant details in https://forms.cloud.microsoft/r/FTX6K2bbnU. Do not invent identity fields or submit before the video exists.
6. Record the form's actual confirmation.
