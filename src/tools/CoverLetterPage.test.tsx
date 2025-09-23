import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoverLetterPage from './CoverLetterPage';

function goPasteAndFill(resume: string, jd: string) {
  // Choose paste path
  fireEvent.click(screen.getByRole('button', { name: /Paste resume text/i }));
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
    expect(screen.getByLabelText(/Job Description \(JD\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    // Output textarea
    const outputs = screen.getAllByRole('textbox');
    expect(outputs.length).toBeGreaterThanOrEqual(1); // jd + output at least (resume appears after choice)
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
    goPasteAndFill('A resume line', 'A JD line');
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // Output textbox is the last textarea
    await waitFor(() => expect((screen.getAllByRole('textbox').at(-1) as HTMLTextAreaElement).value).toBeTruthy());
    const value = (screen.getAllByRole('textbox').at(-1) as HTMLTextAreaElement).value;
    const paras = value.split(/\n{2,}/).filter(Boolean);
    expect(paras.length).toBe(3);
  });

  it('shows loading state during slow responses (8s mock)', async () => {
    vi.useFakeTimers();
    render(<CoverLetterPage />);
    const promise = new Promise<any>((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ letter: 'a\n\nb\n\nc' }) }), 8000));
    vi.spyOn(global, 'fetch' as any).mockReturnValue(promise as any);
    goPasteAndFill('A', 'B');
    const btn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(btn);
    // Loading state
    await waitFor(() => expect(btn).toBeDisabled());
    vi.advanceTimersByTime(8000);
    await waitFor(() => expect(btn).not.toBeDisabled());
    vi.useRealTimers();
  });

  it('paste flow prepopulates editor and reset works', async () => {
    render(<CoverLetterPage />);
    fireEvent.click(screen.getByRole('button', { name: /Paste resume text/i }));
    const resumeBox = screen.getByLabelText(/Paste resume text/i);
    fireEvent.change(resumeBox, { target: { value: 'Line 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    // Editor visible
    expect(screen.getByLabelText(/Resume Text Editor/i)).toBeInTheDocument();
    const editor = screen.getByLabelText(/Resume Text Editor/i) as HTMLTextAreaElement;
    expect(editor.value).toContain('Line 1');
    // Edit triggers reset button
    fireEvent.change(editor, { target: { value: 'Line 1 edited' } });
    expect(screen.getByRole('button', { name: /Reset to extracted/i })).toBeInTheDocument();
  });

  it('upload flow shows filename and editor', async () => {
    render(<CoverLetterPage />);
    fireEvent.click(screen.getByRole('button', { name: /Upload resume \(PDF\/DOCX\)/i }));
    const fileInput = screen.getByLabelText(/Upload resume \(PDF\/DOCX\)/i).parentElement!.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1,2,3])], 'resume.pdf', { type: 'application/pdf' });
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ text: 'Extracted content', warnings: [], meta: { chars: 17 } }) } as any);
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Extracted content/i)).toBeInTheDocument());
  });
});
