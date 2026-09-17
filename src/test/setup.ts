class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver;

// vue-input-otp dispatches native events from a delayed callback. In Node 20 the
// global Event comes from undici, while jsdom requires its own Event constructor.
// Keep both sides on the same DOM implementation during component tests.
if (typeof window !== 'undefined') globalThis.Event = window.Event;
