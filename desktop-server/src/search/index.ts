// Barrel re-exports — split modules preserve stable import paths.
export {
  registerProjectSlot,
  setActiveProjectFocus,
  registerSearchModule,
  closeSearchModule,
  getSearchQueue,
  getSearchWatchPaths,
  getActiveProjectRoot,
  listProjectSlots,
  switchSearchProject,
  enqueueProjectIndex,
  enqueueFastIndexPocket,
  enqueuePocketIndexHints,
  enqueueReindexPaths,
  bootstrapRegisteredProjects,
} from './search-index.core.js';
export {
  getDeviceFastIndexPocketStatus,
  shouldRunInstallPocketPlanner,
} from './indexer/device-fast-index-pocket.js';
export { runInstallDevicePocketPlannerForApp } from './search-index.core.js';
