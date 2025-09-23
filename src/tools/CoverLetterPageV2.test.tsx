import { render, screen } from '@testing-library/react';
import CoverLetterPageV2 from './CoverLetterPageV2';

describe('CoverLetterPageV2', () => {
  it('renders header and basic actions (smoke)', () => {
    render(<CoverLetterPageV2 />);
    // A generate button exists either in Figma component or fallback
    const generateBtn = screen.getAllByRole('button').find((b) => /generate/i.test(b.textContent || ''));
    expect(generateBtn).toBeTruthy();
  });
});
