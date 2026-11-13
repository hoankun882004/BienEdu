// Stage a narrow underlying history fix without changing the active runtime.
// No timer-based DOM retry, synthetic PopStateEvent, or progress-ID migration.
export function stageGeometryNavigation(source){
  const replacements=[
    ['let lessonTransitionLock = false;', 'let lessonTransitionLock = false;\nlet pendingLessonHistory = null;'],
    ['  if (lessonTransitionLock) return;\n  lessonTransitionLock = true;',
      '  if (lessonTransitionLock) {\n    if (!updateHistory) pendingLessonHistory = { href, restoreState };\n    return;\n  }\n  lessonTransitionLock = true;'],
    ['    lessonTransitionLock = false;\n  }\n}\n\nfunction navigate(',
      '    lessonTransitionLock = false;\n    const pending = pendingLessonHistory;\n    pendingLessonHistory = null;\n    if (pending && new URL(pending.href, location.href).href === location.href) {\n      await transitionLessonRoute(pending.href, { updateHistory: false, restoreState: pending.restoreState });\n    }\n  }\n}\n\nfunction navigate(']
  ];
  for(const [before,after]of replacements){if(source.split(before).length!==2)throw Error('History baseline changed; inspect before preparing a new continuation');source=source.replace(before,after);}return source;
}
