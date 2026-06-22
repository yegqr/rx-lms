/**
 * Canonical shapes for `Item.content` (Prisma Json column), keyed by ItemType.
 * This is the SHARED CONTRACT between the content seed and the student UI.
 * Body fields hold HTML strings (sanitized at render time).
 */

export type ItemType =
  | "overview"
  | "lesson"
  | "reading"
  | "quiz"
  | "discussion"
  | "assignment";

export interface OverviewContent {
  body: string; // HTML: block intro, learning outcomes
  outcomes?: string[];
}

export interface LessonContent {
  body: string; // HTML lesson prose
  videoTitle?: string;
  duration?: string;
}

export interface ReadingContent {
  body: string; // HTML reading guide
  readingTime?: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number; // index into options
  feedback?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passThreshold?: number; // out of questions.length; defaults to 60%
  retutorial?: string; // shown when below threshold
}

export interface DiscussionSeedPost {
  name: string;
  role?: string;
  color?: string;
  when?: string;
  body: string;
}

export interface DiscussionContent {
  prompt: string; // HTML
  seedPosts?: DiscussionSeedPost[];
}

export interface RubricCriterion {
  dimension: string;
  weight?: number;
  descriptor?: string;
}

export interface AssignmentContent {
  brief: string; // HTML
  rubric?: RubricCriterion[];
  dueDate?: string;
  exemplar?: string; // HTML exemplar essay (optional)
}

export type ItemContent =
  | OverviewContent
  | LessonContent
  | ReadingContent
  | QuizContent
  | DiscussionContent
  | AssignmentContent;

/** Plain seed shape consumed by prisma/seed.ts */
export interface SeedItem {
  type: ItemType;
  title: string;
  duration?: string;
  passThreshold?: number;
  content: ItemContent;
}

export interface SeedModule {
  number: number;
  title: string;
  summary?: string;
  myth?: string;
  isPreview?: boolean;
  items: SeedItem[];
}

export interface SeedCourse {
  slug: string;
  title: string;
  subtitle?: string;
  provider: string; // "rethinkx" | "brik"
  gating?: boolean;
  modules: SeedModule[];
}
