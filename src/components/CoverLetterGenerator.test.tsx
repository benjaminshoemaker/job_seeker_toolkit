import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { CoverLetterGenerator } from './CoverLetterGenerator';

describe('CoverLetterGenerator (frontend)', () => {
  beforeEach(() => {
    // Mock clipboard
    // @ts-expect-error test polyfill
    global.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    // Mock fetch for API endpoints
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input);

      if (url.includes('/api/cover-letter/generate')) {
        return new Response(JSON.stringify({ letter: 'Para 1\n\nPara 2\n\nPara 3' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/jd-from-url')) {
        return new Response(JSON.stringify({ text: 'Imported JD text here', host: 'example.com', source: 'jsonld', warnings: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/extract-resume')) {
        return new Response(JSON.stringify({ text: 'Extracted Resume Text', warnings: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enables generate after inputs and shows letter, then copies', async () => {
    render(<CoverLetterGenerator onBack={() => {}} />);

    // Initially disabled (no inputs)
    const generate = await screen.findByRole('button', { name: /generate cover letter/i });
    expect(generate).toBeDisabled();

    // Resume: paste flow
    fireEvent.click(screen.getByRole('button', { name: /paste resume text/i }));
    const resumeBox = screen.getByPlaceholderText(/paste your resume content here/i);
    fireEvent.change(resumeBox, { target: { value: 'My resume body' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // JD: paste flow
    fireEvent.click(screen.getByRole('button', { name: /paste job description/i }));
    const jdBox = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(jdBox, { target: { value: 'The job description body' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Generate now enabled
    const generate2 = screen.getByRole('button', { name: /generate cover letter/i });
    expect(generate2).toBeEnabled();
    fireEvent.click(generate2);

    // Letter appears in output textarea
    await waitFor(() => {
      expect(screen.getByDisplayValue(/Para 1/)).toBeInTheDocument();
    });

    // Copy the result
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/Para 1[\s\S]*Para 3/));
  });

  it('imports JD from URL and shows source banner', async () => {
    render(<CoverLetterGenerator onBack={() => {}} />);

    // Resume: paste minimum to enable generate later
    fireEvent.click(screen.getByRole('button', { name: /paste resume text/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your resume content here/i), { target: { value: 'Resume' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // JD: URL import
    fireEvent.click(screen.getByRole('button', { name: /import from url/i }));
    const urlInput = screen.getByLabelText(/job posting url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    // Banner appears and editor populated
    await screen.findByText(/Imported from example.com/i);
    await screen.findByDisplayValue(/Imported JD text here/i);
  });

  it('uploads a resume file and populates editor from extraction', async () => {
    render(<CoverLetterGenerator onBack={() => {}} />);

    // Go to upload mode
    fireEvent.click(screen.getByRole('button', { name: /upload resume \(pdf\/docx\)/i }));

    // Select a file via the hidden input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1,2,3])], 'resume.pdf', { type: 'application/pdf' });
    await waitFor(() => expect(fileInput).toBeTruthy());
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Editor should be populated from mocked /api/extract-resume
    await screen.findByDisplayValue(/Extracted Resume Text/i);
    // Uploaded filename is shown
    await screen.findByText(/resume\.pdf/i);
  });

  it('replaces an uploaded resume with another file', async () => {
    render(<CoverLetterGenerator onBack={() => {}} />);

    // Initial upload
    fireEvent.click(screen.getByRole('button', { name: /upload resume \(pdf\/docx\)/i }));
    const firstInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File([new Uint8Array([1,2,3])], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(firstInput, { target: { files: [file1] } });
    await screen.findByDisplayValue(/Extracted Resume Text/i);
    await screen.findByText(/resume\.pdf/i);

    // Click Replace and choose a new file
    const replaceBtn = screen.getByRole('button', { name: /replace/i });
    fireEvent.click(replaceBtn);

    // The replace input is another hidden file input now present in the DOM
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const replaceInput = inputs.find((el) => el !== firstInput)!;
    const file2 = new File([new Uint8Array([4,5,6])], 'resume2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(replaceInput, { target: { files: [file2] } });

    // Editor stays populated and filename updates
    await screen.findByDisplayValue(/Extracted Resume Text/i);
    await screen.findByText(/resume2\.docx/i);
  });

  it('removes uploaded resume and returns to choose state', async () => {
    render(<CoverLetterGenerator onBack={() => {}} />);

    // Upload a file first
    fireEvent.click(screen.getByRole('button', { name: /upload resume \(pdf\/docx\)/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1,2,3])], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByDisplayValue(/Extracted Resume Text/i);

    // Click the remove (X) button
    const removeBtn = screen.getByRole('button', { name: /remove uploaded resume/i });
    fireEvent.click(removeBtn);

    // Back to choose state
    await screen.findByRole('button', { name: /upload resume \(pdf\/docx\)/i });
    await screen.findByRole('button', { name: /paste resume text/i });
    expect(screen.queryByDisplayValue(/Extracted Resume Text/i)).toBeNull();
  });
});
