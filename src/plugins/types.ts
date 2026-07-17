import type { ReactNode } from 'react';
import type { CustomElement } from '../element/types';
import type { Point } from '../utils/geometry';

/**
 * The plugin contract.
 *
 * Adding an element type used to mean editing fifteen files — types, render,
 * hitTest, persist, search, toolbar, and so on. Everything a new element needs
 * now lives behind this interface, so a plugin is one file that registers
 * itself and touches no core code.
 *
 * The core knows only `CustomElement`: a box (x/y/width/height/angle, shared
 * with every other element, so move/resize/rotate/z-order/group/delete/undo all
 * work for free) plus a `data` bag the core never reads. Everything specific to
 * an element type is a method here.
 */

export type PluginCategory = 'basic' | 'text' | 'diagram' | 'data' | 'media';

export interface InsertContext {
  /** Scene point to insert at — the viewport centre, or where the menu opened. */
  at: Point;
  /** Canvas size in CSS pixels, for sizing something sensibly. */
  viewport: { width: number; height: number };
}

export interface RenderContext {
  /**
   * Already translated and rotated into the element's local frame: (0,0) is the
   * element's top-left, so a plugin draws at 0..width, 0..height and never
   * thinks about the viewport.
   */
  ctx: CanvasRenderingContext2D;
  /** Divide any on-screen constant by this to keep it zoom-independent. */
  zoom: number;
  /** Dark theme is active. Element colours still come from the element. */
  dark: boolean;
}

export interface ElementPlugin<Data = Record<string, unknown>> {
  /** Stable and unique; persisted on every element this plugin creates. */
  id: string;

  // ---- menu presentation

  label: string;
  icon: ReactNode;
  category: PluginCategory;
  /** One line, shown under the label. */
  description?: string;
  /** Extra terms the menu's own search should match. */
  keywords?: string[];

  // ---- behaviour

  /**
   * Build the element(s) to insert. Return several to insert a group.
   * Called with the plugin's own defaults; the core assigns id/seed/version.
   */
  create(context: InsertContext): PluginElementInit<Data> | PluginElementInit<Data>[];

  /** Draw it, in element-local space. */
  render(element: CustomElement<Data>, context: RenderContext): void;

  /**
   * Text this element should be findable by. Optional: elements with nothing
   * to say simply are not indexed beyond their label.
   */
  searchText?(element: CustomElement<Data>): string;

  /**
   * Hit test in element-local coordinates. Defaults to the bounding box, which
   * is right for the great majority of elements.
   */
  hitTest?(element: CustomElement<Data>, local: Point): boolean;

  /** Double-click behaviour, e.g. open an editor. */
  onDoubleClick?(element: CustomElement<Data>): void;

  /**
   * Drop unknown or corrupt data from a file rather than trusting it. Return
   * null to reject the element entirely.
   */
  reviveData?(raw: unknown): Data | null;

  /** Smallest sensible size, enforced on resize. */
  minSize?: { width: number; height: number };
}

/** What create() returns: geometry plus the plugin's own data. */
export interface PluginElementInit<Data = Record<string, unknown>> {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Data;
  /** Optional overrides; the current style state is used otherwise. */
  strokeColor?: string;
  backgroundColor?: string;
}
