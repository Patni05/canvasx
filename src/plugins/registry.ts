import type { CustomElement } from '../element/types';
import type { ElementPlugin, PluginCategory } from './types';

/**
 * The plugin registry.
 *
 * A plain map, deliberately. The value here is not the data structure — it is
 * that render/hitTest/persist/search all resolve an element's behaviour through
 * this one lookup, so none of them has to know what plugins exist.
 */
const plugins = new Map<string, ElementPlugin<never>>();

export function registerPlugin<Data>(plugin: ElementPlugin<Data>): void {
  if (plugins.has(plugin.id)) {
    // Ids are persisted onto elements, so a collision would silently make one
    // plugin render another's data.
    throw new Error(`Duplicate plugin id "${plugin.id}"`);
  }
  plugins.set(plugin.id, plugin as unknown as ElementPlugin<never>);
}

/**
 * Undefined for an element written by a plugin that is not loaded — a real case
 * once files outlive the code that made them. Callers must handle it; the
 * renderer draws a placeholder rather than throwing.
 */
export const getPlugin = (id: string): ElementPlugin<never> | undefined => plugins.get(id);

export const getPluginFor = (element: CustomElement): ElementPlugin<never> | undefined =>
  plugins.get(element.pluginId);

export const listPlugins = (): ElementPlugin<never>[] => [...plugins.values()];

export const CATEGORY_ORDER: PluginCategory[] = ['basic', 'text', 'diagram', 'data', 'media'];

export const CATEGORY_LABEL: Record<PluginCategory, string> = {
  basic: 'Basic',
  text: 'Text',
  diagram: 'Diagram',
  data: 'Data',
  media: 'Media',
};

/**
 * Menu search. Matches the label, description and any declared keywords, so
 * "note" finds the sticky and "if" finds the decision diamond.
 */
export function searchPlugins(query: string): ElementPlugin<never>[] {
  const q = query.trim().toLowerCase();
  const all = listPlugins();
  if (q === '') return all;

  return all
    .map((plugin) => {
      const label = plugin.label.toLowerCase();
      const haystack = [label, plugin.description ?? '', ...(plugin.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return null;
      // A label match beats a keyword match, and a prefix beats a substring.
      const rank = label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2;
      return { plugin, rank };
    })
    .filter((hit): hit is { plugin: ElementPlugin<never>; rank: number } => hit !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((hit) => hit.plugin);
}
