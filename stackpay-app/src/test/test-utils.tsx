import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import '@testing-library/jest-dom';
import { MockAuthProvider, MockWalletProvider } from './mocks/providers';

// Custom render function that includes Router
export function render(
    ui: ReactNode,
    {
        route = '/',
        ...renderOptions
    }: Omit<RenderOptions, 'wrapper'> & { route?: string } = {}
) {
    window.history.pushState({}, 'Test page', route);

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <BrowserRouter>
                <MockAuthProvider>
                    <MockWalletProvider>
                        {children}
                    </MockWalletProvider>
                </MockAuthProvider>
            </BrowserRouter>
        );
    }

    return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';