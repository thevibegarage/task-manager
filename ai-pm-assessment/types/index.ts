// Types shared between server and client. Student-facing types must never carry
// correctness or point information.

export type QuestionType = "single" | "multiple";

export type PublicOption = { id: string; text: string };

export type PublicQuestion = {
  id: string;
  number: number;
  text: string;
  type: QuestionType;
  /** How many options the student must pick (1 for single-select). */
  selectCount: number;
  options: PublicOption[];
};

export type PublicAssessment = {
  id: string;
  title: string;
  description: string;
  questions: PublicQuestion[];
};

export type SubmissionResult = {
  submission_id: string;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
};

export type AssessmentOverview = {
  title: string;
  description: string;
  maxScore: number;
  questionCount: number;
};
