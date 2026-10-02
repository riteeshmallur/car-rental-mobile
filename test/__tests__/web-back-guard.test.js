const { renderHook } = require('@testing-library/react-native');
const { Platform } = require('react-native');

const { useWebBackGuard } = require('@/hooks/use-web-back-guard');

function createWindowHistory() {
  const listeners = new Set();
  const entries = [{}];
  let index = 0;

  return {
    addEventListener: (_event, listener) => listeners.add(listener),
    history: {
      get state() {
        return entries[index];
      },
      back() {
        if (index === 0) {
          return;
        }

        index -= 1;
        listeners.forEach((listener) => listener());
      },
      pushState(state) {
        entries.splice(index + 1);
        entries.push(state);
        index += 1;
      },
    },
    location: { href: 'http://localhost:8081/vehicles/new' },
    removeEventListener: (_event, listener) => listeners.delete(listener),
  };
}

describe('useWebBackGuard', () => {
  const originalPlatform = Platform.OS;
  const originalWindow = global.window;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    global.window = createWindowHistory();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    global.window = originalWindow;
  });

  it('does not pass an overlay cleanup history pop to the parent guard', () => {
    const onParentBack = jest.fn();
    const onOverlayBack = jest.fn();
    const parent = renderHook(() =>
      useWebBackGuard({ active: true, onBack: onParentBack }),
    );
    const overlay = renderHook(() =>
      useWebBackGuard({ active: true, onBack: onOverlayBack }),
    );

    overlay.unmount();

    expect(onOverlayBack).not.toHaveBeenCalled();
    expect(onParentBack).not.toHaveBeenCalled();

    parent.unmount();
  });

  it('sends a browser Back event to the topmost active guard only', () => {
    const onParentBack = jest.fn();
    const onOverlayBack = jest.fn();
    const parent = renderHook(() =>
      useWebBackGuard({ active: true, onBack: onParentBack }),
    );
    const overlay = renderHook(() =>
      useWebBackGuard({ active: true, onBack: onOverlayBack }),
    );

    global.window.history.back();

    expect(onOverlayBack).toHaveBeenCalledTimes(1);
    expect(onParentBack).not.toHaveBeenCalled();

    overlay.unmount();
    parent.unmount();
  });
});
