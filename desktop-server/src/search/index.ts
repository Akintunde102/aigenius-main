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
  enqueueReindexPaths,
  bootstrapRegisteredProjects,
} from './search-index.core.js';
