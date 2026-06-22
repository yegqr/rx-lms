import type { ItemType } from "@/lib/content-types";

/** A sensible empty `content` payload for each item type, created on item insert. */
export function emptyContentFor(type: ItemType): Record<string, unknown> {
  switch (type) {
    case "overview":
      return { body: "", outcomes: [] };
    case "lesson":
      return { body: "", videoUrl: "" };
    case "reading":
      return { body: "" };
    case "quiz":
      return { questions: [] };
    case "discussion":
      return { prompt: "" };
    case "assignment":
      return { brief: "", rubric: [] };
    default:
      return {};
  }
}

export const ITEM_TYPES: ItemType[] = [
  "overview",
  "lesson",
  "reading",
  "quiz",
  "discussion",
  "assignment",
];
