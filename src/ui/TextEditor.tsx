import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onElementsDeleted } from '../element/binding';
import { getContainerOf, redrawBoundText } from '../element/container';
import { mutateElement } from '../element/mutate';
import { fontString, measureText, measureTextElement, textWrapWidth } from '../element/text';
import { isTextElement } from '../element/types';
import { invalidateInteractive, invalidateStatic } from '../scene/render';
import { scene } from '../scene/Scene';
import { record } from '../state/history';
import { setAppState, useAppState } from '../state/store';

/**
 * Editing happens in a real DOM textarea overlaid on the canvas, not a
 * hand-rolled caret. That buys IME, spellcheck, native selection, arrow keys,
 * mobile keyboards, word-jumps and clipboard for free. Reimplementing a caret
 * on canvas is a trap.
 *
 * While this is mounted the canvas SKIPS drawing the element being edited
 * (see renderStatic) — otherwise both paint the same glyphs and you get the
 * doubled, offset text.
 */
export function TextEditor() {
  const editingId = useAppState((state) => state.editingTextElementId);
  const scrollX = useAppState((state) => state.scrollX);
  const scrollY = useAppState((state) => state.scrollY);
  const zoom = useAppState((state) => state.zoom);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  /** Guards against the blur that React fires while unmounting. */
  const committedRef = useRef(false);

  const element = editingId ? scene.getById(editingId) : null;
  const text = element && isTextElement(element) ? element : null;

  // Seed the field from the element each time a new edit begins.
  useEffect(() => {
    committedRef.current = false;
    const current = editingId ? scene.getById(editingId) : null;
    setValue(current && isTextElement(current) ? current.text : '');
  }, [editingId]);

  /**
   * While this editor is mounted for an element, renderStatic must not draw
   * that element — the textarea is already painting those glyphs, and both at
   * once gives doubled, offset text.
   *
   * renderStatic already skips it, but only repaints when told to. Owning the
   * invalidation here, rather than at each of the five call sites that open an
   * editor, means the rule cannot be forgotten by the sixth.
   */
  useEffect(() => {
    invalidateStatic();
    return () => invalidateStatic();
  }, [editingId]);

  useLayoutEffect(() => {
    if (!editingId) return;
    const node = textareaRef.current;
    if (!node) return;

    node.focus({ preventScroll: true });
    // Caret to the END, never select-all: selecting the existing text means the
    // very first keystroke replaces all of it. Editing must be additive.
    const end = node.value.length;
    node.setSelectionRange(end, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  if (!text) return null;

  const container = getContainerOf(text);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;

    const isEmpty = value.trim() === '';

    if (isEmpty) {
      // An empty text is not worth keeping — drop it and its back-reference.
      mutateElement(text, { isDeleted: true });
      onElementsDeleted([text]);
      setAppState({ editingTextElementId: null });
    } else {
      mutateElement(text, { text: value });
      if (container) {
        redrawBoundText(text, container);
      } else {
        // Re-measure through the shared rule so a pinned wrap width survives.
        const measured = measureTextElement({ ...text, text: value });
        mutateElement(text, { width: measured.width, height: measured.height });
      }
      // Stay selected after editing, exactly as Figma does.
      setAppState({
        editingTextElementId: null,
        activeTool: 'selection',
        selectedElementIds: { [text.id]: true },
      });
    }

    scene.emit();
    invalidateStatic();
    invalidateInteractive();
    record();
  };

  // Live sizing so the box grows under the caret as you type. Measured with the
  // element's own wrap rule, so the editor breaks lines exactly where the canvas
  // will — otherwise the text visibly jumps the moment you click away.
  const wrapAt = textWrapWidth(text);
  const metrics = measureText(value || ' ', text.fontSize, text.fontFamily, text.lineHeight, wrapAt);
  const boxWidth = wrapAt ?? Math.max(metrics.width, text.fontSize);
  const boxHeight = Math.max(metrics.height, text.fontSize * text.lineHeight);

  // Scene → viewport: the textarea is a DOM node, so it lives in CSS pixels.
  const left = (text.x + scrollX) * zoom;
  const top = (text.y + scrollY) * zoom;

  return (
    <textarea
      ref={textareaRef}
      className="text-editor"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        // Escape commits. Enter must stay free to insert a newline, and every
        // arrow / Home / End / Backspace is the textarea's own business.
        if (event.key === 'Escape') {
          event.preventDefault();
          commit();
          return;
        }
        // Keep the canvas from reading these as tool shortcuts.
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${boxWidth * zoom}px`,
        height: `${boxHeight * zoom}px`,
        font: fontString(text.fontSize * zoom, text.fontFamily),
        lineHeight: `${text.fontSize * text.lineHeight * zoom}px`,
        color: text.strokeColor,
        textAlign: text.textAlign,
        opacity: text.opacity / 100,
        transform: text.angle ? `rotate(${text.angle}rad)` : undefined,
        transformOrigin: 'center center',
        // Wrap only when a width is pinned; otherwise grow sideways.
        whiteSpace: wrapAt === null ? 'pre' : 'pre-wrap',
        overflowWrap: wrapAt === null ? 'normal' : 'break-word',
      }}
      spellCheck={false}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      aria-label="Edit text"
    />
  );
}
