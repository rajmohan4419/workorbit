let toolPagePromise;

export function loadToolPage() {
  if (!toolPagePromise) {
    toolPagePromise = import('../pages/ToolPage');
  }
  return toolPagePromise;
}

export function preloadToolPage() {
  void loadToolPage();
}
