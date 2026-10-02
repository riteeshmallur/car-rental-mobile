const React = require('react');
const { fireEvent, render } = require('@testing-library/react-native');

const { HostBottomNavigation } = require('@/features/host/components/host-bottom-navigation');
const { canAccessHostMode } = require('@/features/host/utils/host-mode');
const { UserRole } = require('@/types/auth');

const baseUser = {
  capabilities: { canHost: false, canRent: true },
  hostEnabled: false,
  role: UserRole.Customer,
};

describe('shared customer and host account mode', () => {
  it('derives host access from the authenticated user claims', () => {
    expect(canAccessHostMode(baseUser)).toBe(false);
    expect(canAccessHostMode({ ...baseUser, hostEnabled: true })).toBe(true);
    expect(canAccessHostMode({ ...baseUser, capabilities: { canHost: true, canRent: true } })).toBe(true);
    expect(canAccessHostMode({ ...baseUser, role: UserRole.Admin })).toBe(true);
  });

  it('switches host sections by replacing navigation routes only', () => {
    global.__testPathname.mockReturnValue('/dashboard');
    const screen = render(React.createElement(HostBottomNavigation));

    expect(screen.getByLabelText('Dashboard').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByLabelText('Bookings'));

    expect(global.__testRouter.replace).toHaveBeenCalledWith('/(host)/bookings');
  });
});
