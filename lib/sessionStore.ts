import seedData from "@/data/round1.json";
import type {
  Category,
  PublicSessionState,
  SeedBoard,
  SessionSettings,
  SessionState,
  Team,
} from "@/lib/types";

const sessions = new Map<string, SessionState>();

const TEAM_COLORS = [
  "#00E5FF",
  "#FF4DFF",
  "#FFD166",
  "#7CFF6B",
  "#9A7BFF",
  "#FF7A59",
  "#43D9FF",
  "#FFB703",
];

const DEFAULT_SETTINGS: SessionSettings = {
  autoLockOnBuzz: true,
  wrongPenaltyMode: "subtract",
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomId(length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function createCode() {
  return randomId(4);
}

function createPin() {
  return randomId(6);
}

function buildBoard(seed: SeedBoard): Category[] {
  return seed.categories.map((category, categoryIndex) => ({
    id: `cat-${categoryIndex}`,
    name: category.name,
    questions: category.questions.map((question, questionIndex) => ({
      id: `q-${categoryIndex}-${questionIndex}`,
      value: question.value,
      questionText: question.questionText,
      answerText: question.answerText,
      media: question.mediaUrl
        ? { type: "image" as const, url: question.mediaUrl, alt: question.mediaAlt }
        : undefined,
      used: false,
    })),
  }));
}

function getSeedBoard(): Category[] {
  return buildBoard(seedData as SeedBoard);
}

export function createSession(): SessionState {
  let code = createCode();
  while (sessions.has(code)) {
    code = createCode();
  }

  const session: SessionState = {
    code,
    hostPin: createPin(),
    board: getSeedBoard(),
    teams: [],
    buzzingOpen: false,
    winnerTeamId: undefined,
    buzzes: [],
    activeQuestionId: undefined,
    settings: { ...DEFAULT_SETTINGS },
    lastUpdatedAt: Date.now(),
  };

  sessions.set(code, session);
  return session;
}

export function getSession(code: string): SessionState | undefined {
  return sessions.get(code);
}

export function updateSessionTimestamp(session: SessionState) {
  session.lastUpdatedAt = Date.now();
}

export function getPublicState(session: SessionState): PublicSessionState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hostPin, ...rest } = session;
  return rest;
}

export function pickTeamColor(teams: Team[]) {
  const used = new Set(teams.map((team) => team.color));
  const color = TEAM_COLORS.find((candidate) => !used.has(candidate));
  return color ?? TEAM_COLORS[teams.length % TEAM_COLORS.length];
}

export function ensureTeam(
  session: SessionState,
  teamName: string,
  teamId?: string
) {
  if (teamId) {
    const existing = session.teams.find((team) => team.id === teamId);
    if (existing) {
      return existing;
    }
  }

  const newTeam: Team = {
    id: `team-${randomId(6)}`,
    name: teamName,
    color: pickTeamColor(session.teams),
    score: 0,
  };

  session.teams.push(newTeam);
  return newTeam;
}

export function updateBoardFromSeed(session: SessionState, seed: SeedBoard) {
  session.board = buildBoard(seed);
}

export function resetBuzzers(session: SessionState) {
  session.buzzes = [];
  session.winnerTeamId = undefined;
  session.buzzingOpen = false;
}
