/**
 * The app's name, sat beside the main menu.
 *
 * Top-left is where Figma, Excalidraw and Notion all put theirs, so it is the
 * first place the eye looks for it. Purely decorative — aria-hidden, because
 * the document title already carries the app name for assistive tech and
 * hearing it announced on every canvas focus would be noise.
 */
export function Brand() {
  return (
    <span className="brand" aria-hidden="true">
      <img className="brand-mark" src="/favicon-32.png" alt="" width={20} height={20} />
      <span className="brand-name">CanvasX</span>
    </span>
  );
}
