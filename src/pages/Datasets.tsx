import { KindBrowse } from "./KindBrowse";

/**
 * `/datasets` — kind=dataset landing.
 *
 * Datasets are loop-pinned inputs that ship with their own benchmark,
 * so two users running the same loop see identical inputs and scoring.
 */
export function Datasets() {
  return (
    <KindBrowse
      kind="dataset"
      glyph="▤"
      title="Datasets"
      blurb="Loop-pinned inputs that carry their own benchmark — two users running the same loop see identical data and identical scoring."
    />
  );
}
