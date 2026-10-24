# Publication and verification record

## Current deliverable

- Stack: React frontend and Python/FastAPI backend. All ingestion, analysis, database access, and exports are Python.
- Visual reference: GridBricks by REint at https://reint.ai/; independent assessment branding and original implementation.
- Public source: https://github.com/Hargun1/bbc7a6fdf5f9.
- Public Vercel app: **https://aeris-bbc7a6fdf5f9.vercel.app**. Verified without login; the backend reports Python/FastAPI. Storage is the bundled real Elexon snapshot.
- YouTube: the requester chose to record/upload the prepared script. No video URL yet.
- Form: not submitted. The assignment explicitly requires the video first.

## Verification evidence

- 31 Python tests passed locally: analytics, causal history, time boundaries, ingestion validation/conflicts, API validation, revision audit, and CSV.
- React production build passed.
- Migration parity passed for every monthly output and 124 decision-day profiles across all four cutoffs.
- Local FastAPI health returned HTTP 200 with `backend: Python / FastAPI` and `storage: Bundled Elexon snapshot`.
- `docker compose config --quiet` passed. [Python CI run 40112420641](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40112420641) passed for commit `e64d8a9`: all 31 tests, React build, Docker/Python/MongoDB startup, repeat seed, and API parity.
- Vercel deployment `dpl_96zYiSSy2fdMpMzrMWw7icmZRumu` reached READY and was promoted after staged checks. Vercel used Python 3.13 for the API function.
- Unauthenticated production checks passed for the root HTML, Python health, monthly metrics, daily profile, revisions, CSV export (744 rows), API docs, and invalid date (400). Production responses match local reference calculations.
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
