import { render, screen } from '@testing-library/react';
import CoverLetterPageV2 from './CoverLetterPageV2';

describe('CoverLetterPageV2', () => {
  it('renders without crashing (smoke)', () => {
    render(<CoverLetterPageV2 />);
    // With fallback removed, just ensure the page structure renders
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
