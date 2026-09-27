export type Locale = "th" | "en";
export type OwnerType = "user" | "guest";
export type LessonAccess = "free" | "paid";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type ChatMode = "teach" | "hint" | "example" | "practice";

export type Teacher = {
  id: string;
  name: { th: string; en: string };
  subject: { th: string; en: string };
  persona: string;
  teachingInstructions: string;
  greeting: string;
  exampleResponse: string;
  accentBackground: string;
  image: string | null;
  imageStatus: string;
  mvpEnabled: boolean;
};

export type PracticeItem = {
  id: string;
  prompt: string;
  promptEn?: string;
  example?: string;
  feedback?: string;
  feedbackEn?: string;
  hint?: string;
  hintEn?: string;
  answer?: number;
  unit?: string;
};

export type WorkedExample = {
  question: string;
  questionEn?: string;
  steps: string[];
  stepsEn?: string[];
  answer: number;
};

export type Lesson = {
  id: string;
  teacherId: string;
  version: number;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  level: string;
  estimatedMinutes: number;
  access: LessonAccess;
  objectives: string[];
  objectivesEn: string[];
  concepts: string[];
  conceptsEn: string[];
  opening?: string;
  workedExample?: WorkedExample;
  practice: PracticeItem[];
  assessment: { method: string };
};

export type ProgressState = {
  status: ProgressStatus;
  attempts: number;
  hintsUsed: number;
  phase: "chat" | "awaiting";
  practiceIndex: number;
  results: boolean[];
};

export type TutorAssessment = {
  correct: boolean;
  feedback: string;
  rubricScores: Record<string, number>;
} | null;
