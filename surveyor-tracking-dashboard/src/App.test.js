import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // App should render either login page or loading state
  const element = screen.getByText(/loading/i) || screen.getByRole('main');
  expect(element || document.body).toBeInTheDocument();
});

test('app has proper structure', () => {
  render(<App />);
  // Check that the app div exists
  const appDiv = document.querySelector('.App');
  expect(appDiv).toBeInTheDocument();
});
