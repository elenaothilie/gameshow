# Jeopardy Round 1 Webapp

Polished, gameshow-style buzzer app with a Host screen and Team phone UI.

## How to run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on the Host laptop. Teams should open the same URL on their phones.

## Start a session (Host)

1. Go to `/host`.
2. Click **Create Session** to generate a join code and host pin.
3. Share the join code with teams.

To rejoin later, use the **Rejoin Existing Session** panel with the code + pin.

## Join as a team (Phones)

1. Go to `/team`.
2. Enter the join code and team name.
3. Wait for the Host to open buzzing.

## Edit questions

- On the Host screen, click **Edit Questions**.
- Adjust category names, question text, and answers.
- **Export JSON** downloads the current round.
- **Import JSON** lets you load a new round.

Seed data lives in `data/round1.json`.

## File structure highlights

- `app/host/page.tsx` — Host UI
- `app/team/page.tsx` — Team UI
- `pages/api/socket.ts` — Socket.IO server
- `lib/sessionStore.ts` — In-memory session state
- `data/round1.json` — Round 1 seed questions
- `components/*` — Board, modals, overlays, score ticker

## Manual test plan (buzzer correctness)

- Create a session and join with two phones.
- Open buzzing on a question; verify the **first** buzzer shows on Host.
- Confirm auto-lock prevents later buzzes (default ON).
- Reset buzzers; verify teams can buzz again.
- Mark Correct/Wrong and ensure scores update with rule mode.
- Refresh a team browser; verify it reuses the same team identity.
- Refresh Host; verify the session state reloads.
