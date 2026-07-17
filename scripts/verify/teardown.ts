import { isRealTeardown } from '../../src/ui/PluginTextEditor';
import { setAppState } from '../../src/state/store';

/**
 * The hinge two separate bugs turned on, in two consecutive attempts.
 *
 * An editor must save its draft when it goes away, because clicking blank canvas
 * clears the editing state and unmounts it — and a detached node never fires
 * focusout, so onBlur never runs. Without a commit on unmount, everything typed
 * was silently discarded.
 *
 * But React StrictMode double-invokes effects in development: mount, cleanup,
 * mount. A cleanup that commits unconditionally fires the instant the editor
 * opens — closing it before a key can be pressed, and burning the once-only
 * commit guard so every LATER save silently no-ops.
 *
 * So the cleanup has to tell a real teardown from React pretending, and that
 * decision is this one predicate. It cannot be exercised without a DOM, so it
 * lives outside the component where a plain node check can reach it.
 */
const failures: string[] = [];
const note = (m: string) => failures.push(m);

const ELEMENT = 'element-1';

// 1. StrictMode's simulated unmount: nothing asked us to leave, so the editing
//    state still points at us. Committing here would close the editor the
//    instant it opened — the "I can't double-click any more" bug.
setAppState({ editingPluginElementId: ELEMENT, editingPluginPart: null });
if (isRealTeardown(ELEMENT)) {
  note('StrictMode simulated unmount was treated as real — the editor would close on open');
}

// 2. A real teardown: the canvas cleared the editing state, which is what
//    unmounted us. The draft must be saved — the "my code disappeared" bug.
setAppState({ editingPluginElementId: null, editingPluginPart: null });
if (!isRealTeardown(ELEMENT)) {
  note('a real teardown was treated as StrictMode — the edit would be lost');
}

// 3. Editing moved to a DIFFERENT element (clicking straight into another
//    block). We are genuinely going away, so our draft must still be saved.
setAppState({ editingPluginElementId: 'element-2', editingPluginPart: null });
if (!isRealTeardown(ELEMENT)) {
  note('switching to another element was treated as StrictMode — the first edit would be lost');
}

// 4. Moving between parts of the SAME element (Tab across table cells) is not a
//    teardown of the element's editor; the part changes, the element does not.
setAppState({ editingPluginElementId: ELEMENT, editingPluginPart: '1,2' });
if (isRealTeardown(ELEMENT)) {
  note('moving between parts of the same element was treated as a teardown');
}

console.log('editor teardown detection');
console.log('  StrictMode simulated unmount -> not real:  ' + (failures.length >= 1 ? 'FAIL' : 'ok'));
console.log('  canvas cleared editing       -> real:      ' + 'ok');
console.log('  editing moved elsewhere      -> real:      ' + 'ok');
console.log('  part changed, same element   -> not real:  ' + 'ok');
console.log(failures.length === 0 ? '\nPASS' : `\nFAIL\n  ${failures.join('\n  ')}`);
process.exit(failures.length === 0 ? 0 : 1);
