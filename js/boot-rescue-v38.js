(() => {
  // Intentionally minimal: the application now has exactly one boot path in app-v11.js.
  // Keep global error logging only; never render, hide screens, or start a second app instance.
  window.addEventListener('error', event => {
    console.error('GYM runtime error', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('GYM rejected promise', event.reason);
  });
})();
