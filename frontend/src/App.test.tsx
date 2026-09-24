import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('renders the login placeholder at /login', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'LoginPage' })).toBeInTheDocument();
  });

  it('renders the booth placeholder at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'BoothPage' })).toBeInTheDocument();
  });

  it('redirects unknown paths to the booth page', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: 'BoothPage' })).toBeInTheDocument();
  });
});
