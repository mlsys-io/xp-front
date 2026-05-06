import { KindBrowse } from "./KindBrowse";

/**
 * `/skills` — kind=skill landing.
 *
 * Skills are procedural know-how (SKILL.md + optional Python impl)
 * that any application can pull in via `skill_imports[]`.
 */
export function Skills() {
  return (
    <KindBrowse
      kind="skill"
      glyph="⌘"
      title="Skills"
      blurb="Procedural know-how (SKILL.md plus optional Python implementation) that any application can pull in via skill_imports[]."
    />
  );
}
