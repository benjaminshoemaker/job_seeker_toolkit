import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverLetterPage from './CoverLetterPage';

function fillInputs(resume: string, jd: string) {
  const resumeBox = screen.getByLabelText(/Resume \(paste only\)/i);
  const jdBox = screen.getByLabelText(/Job Description \(JD\)/i);
  fireEvent.change(resumeBox, { target: { value: resume } });
  fireEvent.change(jdBox, { target: { value: jd } });
}

describe('CoverLetterPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders inputs and output box (smoke)', () => {
    render(<CoverLetterPage />);
    expect(screen.getByText(/Cover Letter Generator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Resume \(paste only\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Job Description \(JD\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    // Output textarea
    const outputs = screen.getAllByRole('textbox');
    expect(outputs.length).toBeGreaterThanOrEqual(3); // resume, jd, output
  });

  it('does not call API when inputs are empty', async () => {
    render(<CoverLetterPage />);
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ letter: 'x\n\ny\n\nz' }) } as any);
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('normalizes output to exactly three paragraphs', async () => {
    render(<CoverLetterPage />);
    const letter = 'p1\n\np2\n\np3\n\nextra';
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ letter }) } as any);
    fillInputs('A resume line', 'A JD line');
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => expect((screen.getAllByRole('textbox')[2] as HTMLTextAreaElement).value).toBeTruthy());
    const value = (screen.getAllByRole('textbox')[2] as HTMLTextAreaElement).value;
    const paras = value.split(/\n{2,}/).filter(Boolean);
    expect(paras.length).toBe(3);
  });

  it('shows loading state during slow responses (8s mock)', async () => {
    vi.useFakeTimers();
    render(<CoverLetterPage />);
    const promise = new Promise<any>((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ letter: 'a\n\nb\n\nc' }) }), 8000));
    vi.spyOn(global, 'fetch' as any).mockReturnValue(promise as any);
    fillInputs('A', 'B');
    const btn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(btn);
    // Loading state
    await waitFor(() => expect(btn).toBeDisabled());
    vi.advanceTimersByTime(8000);
    await waitFor(() => expect(btn).not.toBeDisabled());
    vi.useRealTimers();
  });
});

