import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlugin } from '../../src/plugins/registry';
import type { CustomElement } from '../../src/element/types';
import '../../src/plugins/builtin';

/**
 * The table's data model is the single source of truth for cell text: the editor
 * only edits it. So every promise about persistence — typing, blur, undo, save
 * and reload, copy, duplicate — reduces to this model round-tripping, and all of
 * it is pure and testable without a DOM.
 *
 * It regressed in exactly the place that is NOT covered here: nothing resolved
 * which cell was clicked, so setText was handed a null part, hit its
 * `if (!at) return element.data` guard, and returned the data unchanged. Every
 * keystroke was discarded on commit while looking fine as you typed, because the
 * textarea held it in local state.
 *
 * That guard is correct and stays. What follows pins down what it must and must
 * not swallow.
 */
const failures: string[] = [];
const note = (m: string) => failures.push(m);

const table = getPlugin('table');
if (!table) {
  console.log('table plugin not registered\n\nFAIL');
  process.exit(1);
}

const editing = table.editing!;

const make = (): CustomElement =>
  ({
    id: 't1',
    type: 'custom',
    pluginId: 'table',
    x: 0,
    y: 0,
    width: 360,
    height: 108,
    angle: 0,
    isDeleted: false,
    data: {
      colWidths: [120, 120, 120],
      rowHeights: [36, 36, 36],
      cells: {},
      headerRow: true,
      borderColor: '#adb5bd',
    },
  }) as unknown as CustomElement;

const withData = (element: CustomElement, data: unknown): CustomElement =>
  ({ ...element, data }) as CustomElement;

// ---------------------------------------------- a click resolves to a cell

/**
 * The entry point that was missing. getPartAt exists and is correct; nothing
 * called it. These pin the mapping so a wiring change cannot silently hand
 * setText a null part again.
 */
const el = make();
const cases: [x: number, y: number, expected: string | null][] = [
  [10, 10, '0,0'],
  [130, 10, '0,1'],
  [250, 10, '0,2'],
  [10, 50, '1,0'],
  [250, 100, '2,2'],
  [359, 107, '2,2'],
  // Outside the grid: there is nowhere to write, so there is nothing to edit.
  [400, 10, null],
  [10, 200, null],
];

for (const [x, y, expected] of cases) {
  const actual = editing.getPartAt!(el as never, { x, y });
  if (actual !== expected) note(`getPartAt(${x},${y}) -> ${actual}, expected ${expected}`);
}

// ------------------------------------------------------- text persistence

// 1. A real part persists. This is the bug: it silently did not.
let data = editing.setText(el as never, 'Hello', '1,1');
if (editing.getText(withData(el, data) as never, '1,1') !== 'Hello') {
  note('setText with a valid part did not persist — cell text is being discarded');
}

// 2. A null part is a no-op, by design: there is no cell to write to. The
//    caller must resolve a part first.
const before = JSON.stringify(el.data);
const after = JSON.stringify(editing.setText(el as never, 'Hello', null));
if (before !== after) note('setText with a null part changed the data; it has no cell to write to');

// 3. Cells are independent — writing one must not disturb another.
let multi = make().data;
for (const [part, text] of [['0,0', 'A'], ['0,1', 'B'], ['2,2', 'C']] as const) {
  multi = editing.setText(withData(el, multi) as never, text, part);
}
for (const [part, text] of [['0,0', 'A'], ['0,1', 'B'], ['2,2', 'C']] as const) {
  if (editing.getText(withData(el, multi) as never, part) !== text) {
    note(`cell ${part} lost its text when other cells were written`);
  }
}

// 4. Overwriting replaces rather than appends.
const over = editing.setText(withData(el, multi) as never, 'A2', '0,0');
if (editing.getText(withData(el, over) as never, '0,0') !== 'A2') note('overwriting a cell failed');

// 5. Emptying a cell drops the entry, so the map stays sparse instead of
//    accumulating a blank for every cell ever visited.
const cleared = editing.setText(withData(el, over) as never, '', '0,0') as { cells: object };
if ('0,0' in cleared.cells) note('emptying a cell left a blank entry behind');
if (!('0,1' in cleared.cells)) note('emptying one cell removed another');

// 6. Text survives characters that break naive serialization.
for (const awkward of ['a,b', 'line\nbreak', '"quoted"', '{"json":true}', 'émoji ✎', '  spaced  ']) {
  const round = editing.setText(el as never, awkward, '1,2');
  if (editing.getText(withData(el, round) as never, '1,2') !== awkward) {
    note(`text ${JSON.stringify(awkward)} did not round-trip`);
  }
}

// ------------------------------------------- save / reload / copy / paste

/**
 * Save-and-reload, copy-paste and duplicate all funnel through JSON plus
 * reviveData, so one round trip covers all three.
 */
const populated = editing.setText(withData(el, multi) as never, 'Kept', '1,1');
const revived = table.reviveData!(JSON.parse(JSON.stringify(populated))) as { cells: Record<string, { text: string }> };

if (!revived) note('reviveData rejected its own valid data');
else {
  for (const [part, text] of [['0,0', 'A'], ['0,1', 'B'], ['2,2', 'C'], ['1,1', 'Kept']] as const) {
    if (revived.cells[part]?.text !== text) note(`cell ${part} was lost across save/reload`);
  }
}

// Cells outside the grid are dropped rather than kept as data nothing can show.
const stray = table.reviveData!({
  colWidths: [120],
  rowHeights: [36],
  cells: { '0,0': { text: 'in' }, '9,9': { text: 'out' } },
}) as { cells: Record<string, unknown> };
if (!('0,0' in stray.cells)) note('reviveData dropped an in-bounds cell');
if ('9,9' in stray.cells) note('reviveData kept a cell outside the grid');

// Junk is rejected rather than trusted.
if (table.reviveData!('not an object') !== null) note('reviveData accepted a non-object');

// ------------------------------------------------------------ navigation

const nav: [from: string, dir: 'next' | 'previous' | 'up' | 'down', to: string | null][] = [
  ['0,0', 'next', '0,1'],
  ['0,2', 'next', '1,0'],
  ['1,0', 'previous', '0,2'],
  ['0,0', 'previous', null],
  ['2,2', 'next', null],
  ['0,1', 'down', '1,1'],
  ['1,1', 'up', '0,1'],
  ['0,1', 'up', null],
  ['2,1', 'down', null],
];

for (const [from, dir, to] of nav) {
  const actual = editing.nextPart!(el as never, from, dir);
  if (actual !== to) note(`nextPart(${from}, ${dir}) -> ${actual}, expected ${to}`);
}

// ------------------------------------------- the wiring that actually broke

/**
 * Everything above passed while the feature was completely broken, because the
 * data model was never the problem: getPartAt was correct, setText was correct,
 * reviveData was correct. Nothing CALLED getPartAt. editingPluginPart stayed
 * null and every keystroke went into the `if (!at) return element.data` guard.
 *
 * A pure check cannot see that — it needs the pointer handler. So this greps for
 * the call instead. Crude, but it guards precisely the line whose absence cost a
 * whole feature, and it costs nothing.
 */
const handler = readFileSync(join(process.cwd(), 'src/scene/interaction.ts'), 'utf8');
if (!/getPartAt/.test(handler)) {
  note(
    'src/scene/interaction.ts never calls getPartAt — a parts-based plugin will ' +
      'receive a null part and silently discard every edit',
  );
}
if (!/editingPluginPart:\s*part/.test(handler)) {
  note(
    'src/scene/interaction.ts never sets editingPluginPart from a resolved part — ' +
      'double-clicking a table cell will edit the whole table instead',
  );
}

console.log('table data model');
console.log(`  click -> cell mapping:      ${cases.length} cases`);
console.log(`  text persistence:           write, isolate, overwrite, clear, awkward chars`);
console.log(`  save / reload / copy:       round trip + out-of-bounds pruning`);
console.log(`  Tab / Enter navigation:     ${nav.length} cases`);
console.log('  double-click resolves a cell: wired');
console.log(failures.length === 0 ? '\nPASS' : `\nFAIL\n  ${failures.join('\n  ')}`);
process.exit(failures.length === 0 ? 0 : 1);
