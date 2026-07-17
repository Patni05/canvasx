import { useSyncExternalStore } from 'react';
import { invalidateStatic } from '../scene/render';
import { scene } from '../scene/Scene';
import { canRedo, canUndo, redo, undo } from '../state/history';
import { setAppState, useAppState } from '../state/store';
import { GridIcon, RedoIcon, SnapIcon, UndoIcon } from './Icons';

const DEFAULT_GRID_SIZE = 20;

export function CanvasOptions() {
  const gridSize = useAppState((state) => state.gridSize);
  const snapEnabled = useAppState((state) => state.objectsSnapModeEnabled);

  // Undo availability changes with the scene, which React cannot see directly.
  useSyncExternalStore(scene.subscribe, scene.getRevision);

  return (
    <div className="canvas-options island" role="group" aria-label="Canvas options">
      <button
        className="tool"
        onClick={undo}
        disabled={!canUndo()}
        aria-label="Undo"
        data-tooltip="Undo  Ctrl+Z"
      >
        <UndoIcon />
      </button>
      <button
        className="tool"
        onClick={redo}
        disabled={!canRedo()}
        aria-label="Redo"
        data-tooltip="Redo  Ctrl+Shift+Z"
      >
        <RedoIcon />
      </button>

      <span className="toolbar-divider" role="separator" />

      <button
        className={gridSize ? 'tool active' : 'tool'}
        onClick={() => {
          setAppState({ gridSize: gridSize ? null : DEFAULT_GRID_SIZE });
          invalidateStatic();
        }}
        aria-pressed={gridSize !== null}
        aria-label="Toggle grid and grid snapping"
        data-tooltip="Grid — snaps while on"
      >
        <GridIcon />
      </button>
      <button
        className={snapEnabled ? 'tool active' : 'tool'}
        onClick={() => setAppState({ objectsSnapModeEnabled: !snapEnabled })}
        aria-pressed={snapEnabled}
        aria-label="Toggle snapping to other objects"
        data-tooltip="Snap to objects"
      >
        <SnapIcon />
      </button>
    </div>
  );
}
