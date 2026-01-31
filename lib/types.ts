export type MediaAsset = {
  type: "image";
  url: string;
  alt?: string;
};

export type Question = {
  id: string;
  value: number;
  questionText: string;
  answerText?: string;
  media?: MediaAsset;
  used: boolean;
};

export type Category = {
  id: string;
  name: string;
  questions: Question[];
};

export type Team = {
  id: string;
  name: string;
  color: string;
  icon?: string;
  score: number;
};

export type Buzz = {
  teamId: string;
  timestamp: number;
};

export type SessionSettings = {
  autoLockOnBuzz: boolean;
  wrongPenaltyMode: "subtract" | "zero";
};

export type SessionState = {
  code: string;
  hostPin: string;
  board: Category[];
  teams: Team[];
  buzzingOpen: boolean;
  winnerTeamId?: string;
  buzzes: Buzz[];
  activeQuestionId?: string;
  settings: SessionSettings;
  lastUpdatedAt: number;
};

export type PublicSessionState = Omit<SessionState, "hostPin">;

export type SeedBoard = {
  categories: Array<{
    name: string;
    questions: Array<{
      value: number;
      questionText: string;
      answerText?: string;
      mediaUrl?: string;
      mediaAlt?: string;
    }>;
  }>;
};
