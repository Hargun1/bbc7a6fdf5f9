# Publication and submission record

## Current state

- Application: implemented, with real Elexon historical data.
- Public app URL: **not created yet**.
- Public GitHub repository URL: https://github.com/Hargun1/bbc7a6fdf5f9 (anonymous repository name).
- Unlisted YouTube video URL: **not created yet**. The requester chose to record the prepared script themselves.
- Microsoft form: **not submitted**. The assignment explicitly requires the video before submission.
- Private/incognito public-access verification: **pending the three published URLs**.
- Unauthenticated HTTP access to the public repository and raw README: **verified, both HTTP 200**. This is recorded separately from the requested incognito browser check, which has not occurred.

The existing local GitHub credential was verified for account Hargun1 and used to create the public repository. Vercel's integration is not connected and no local Vercel credential was found. The requester will record/upload the video. Do not substitute fake links or mark this assignment submitted.

## Local verification record

- Real Elexon snapshot downloaded and provenance hashes recorded.
- Analytics/API tests: 16 passing on the initial check, covering causal selection, alignment, metrics, risk history, date boundaries, validation, CSV, and revisions.
- Vite production build: passed.
- **Full-stack CI passed:** [run 40109487897](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40109487897), tested source commit `edcabf8`. This includes `npm ci`, all 16 tests, the production React build, Docker image build and Compose startup, a second idempotent seed, and the MongoDB-backed API/frontend integration check. The final documentation-only commit records these results.
- A local standalone MongoDB test binary download failed with `getaddrinfo ENOTFOUND fastdl.mongodb.org`; that temporary test dependency was removed. The successful CI check uses the real Compose stack instead.
- Local React frontend and Express API: started; frontend HTTP 200 verified.
- `docker compose config --quiet`: passed.
- Local Docker runtime: `docker compose -p aeris-pilot build` could not connect to `//./pipe/dockerDesktopLinuxEngine`, even after Docker Desktop was started. The image build and Compose startup were subsequently **verified successfully in CI**, as above.
- Browser automation: unavailable in this session. Responsive layout and browser interactions are implemented but must not be represented as visually verified.

## Publish and verify

1. Confirm the code and README in the [public repository](https://github.com/Hargun1/bbc7a6fdf5f9).
2. Deploy on Vercel as described in README. A hosted MongoDB connection is needed if the deployment must use all four MERN components; otherwise the explicit snapshot adapter is suitable for a public pilot review.
3. Record the real product and technical review using `demo-script.md`. Upload the resulting maximum-ten-minute recording to YouTube as **Unlisted**. Ensure neither section's initial overview exceeds five minutes.
4. Replace the pending entries in README with the verified production app URL and recording/repository links.
5. Open an incognito/private window with no GitHub/Vercel/Google login. Open each exact submission URL. Verify the repository and README can be read, the app loads all views and calls `/api/health`, and the video plays with sound without requesting access.
6. Open the [submission form](https://forms.cloud.microsoft/r/FTX6K2bbnU), inspect its current fields, and enter the verified URLs and the applicant's requested identity details. Do not invent missing personal details.
7. Submit only when the required video exists and all URLs have passed the access check. Record the form's actual confirmation, rather than inferring success from clicking Submit.

The form and URLs were supplied by the requester; this checklist does not imply that publication or submission has occurred.
