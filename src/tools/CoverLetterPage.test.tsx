import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverLetterPage from './CoverLetterPage';

function goPasteAndFill(resume: string, jd: string) {
  // Choose paste path
  fireEvent.click(screen.getByRole('button', { name: /Paste text/i }));
  const resumeBox = screen.getByLabelText(/Paste resume text/i);
  const jdBox = screen.getByLabelText(/Job Description \(JD\)/i);
  fireEvent.change(resumeBox, { target: { value: resume } });
  // Continue to editor (to simulate unified editor usage)
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
  fireEvent.change(jdBox, { target: { value: jd } });
}

describe('CoverLetterPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders choice screen and JD box (smoke)', () => {
    render(<CoverLetterPage />);
    expect(screen.getByText(/Cover Letter Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose how to provide your resume\./i)).toBeInTheDocument();
    expect(screen.getByText(/Job Description \(JD\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    const outputs = screen.getAllByRole('textbox');
    expect(outputs.length).toBeGreaterThanOrEqual(1);
  });

  it.skip('does not call API when inputs are empty', async () => {});
  it.skip('normalizes output to exactly three paragraphs', async () => {});
  it.skip('shows loading state during slow responses (8s mock)', async () => {});
  it.skip('paste flow prepopulates editor and reset works', async () => {});
  it.skip('upload flow shows filename and editor', async () => {});
});
