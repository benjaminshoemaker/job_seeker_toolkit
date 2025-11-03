import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { CoverLetterGenerator } from './CoverLetterGenerator';

function fillResumePaste(value: string) {
  fireEvent.click(screen.getByRole('button', { name: /paste resume text/i }));
  const box = screen.getByPlaceholderText(/paste your resume content here/i);
  fireEvent.change(box, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function fillJDPaste(value: string) {
  fireEvent.click(screen.getByRole('button', { name: /paste job description/i }));
  const box = screen.getByPlaceholderText(/paste the job description here/i);
  fireEvent.change(box, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

describe('CoverLetterGenerator generation flows', () => {
  beforeEach(() => {
    // @ts-expect-error test polyfill
    global.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays disabled with missing/whitespace inputs and never calls API', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any);
    render(<CoverLetterGenerator onBack={() => {}} />);

    const generate = await screen.findByRole('button', { name: /generate cover letter/i });
    expect(generate).toBeDisabled();

    // Enter resume only (valid)
    fillResumePaste('My resume');
    expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeDisabled();

    // Enter whitespace JD (invalid)
    fireEvent.click(screen.getByRole('button', { name: /paste job description/i }));
    const jdBox = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(jdBox, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeDisabled();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prevents generation when character limit exceeded', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any);
    render(<CoverLetterGenerator onBack={() => {}} />);

    const long = 'x'.repeat(10001); // above MAX_CHAR_LIMIT (10000)
    fillResumePaste(long);
    fillJDPaste('JD ok');

    const generate = screen.getByRole('button', { name: /generate cover letter/i });
    expect(generate).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends correct payload and renders multi-paragraph letter', async () => {
    const resume = 'Senior Engineer with 10 years building SaaS.';
    const jd = 'We need an engineer to own billing and growth.';
    const returned = 'First paragraph.\n\nSecond paragraph with details.\n\nThird paragraph.';

    const fetchMock = vi.spyOn(global, 'fetch' as any).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input);
      if (url.includes('/api/cover-letter/generate')) {
        const body = JSON.parse(String(init?.body || '{}'));
        expect(body).toEqual({ resume, jd });
        return new Response(JSON.stringify({ letter: returned }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 200 });
    });

    render(<CoverLetterGenerator onBack={() => {}} />);
    fillResumePaste(resume);
    fillJDPaste(jd);

    const generate = screen.getByRole('button', { name: /generate cover letter/i });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    // Find the readOnly output textarea and verify content
    // Wait for the Copy button to confirm output rendered
    await screen.findByRole('button', { name: /copy/i });
    // Query by readonly attribute to target the output area reliably
    const output = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
    expect(output).not.toBeNull();
    expect(output!.value).toBe(returned);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables generation while waiting', async () => {
    let resolveFetch: (v: any) => void = () => {};
    const resume = 'A';
    const jd = 'B';
    const returned = 'Done.';

    vi.spyOn(global, 'fetch' as any).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/cover-letter/generate')) {
        return new Promise<Response>((res) => {
          resolveFetch = (v) => res(new Response(JSON.stringify({ letter: returned }), { status: 200 }));
        }) as unknown as Response;
      }
      return new Response('{}', { status: 200 });
    });

    render(<CoverLetterGenerator onBack={() => {}} />);
    fillResumePaste(resume);
    fillJDPaste(jd);

    const generate = screen.getByRole('button', { name: /generate cover letter/i });
    fireEvent.click(generate);

    // While pending
    expect(generate).toBeDisabled();
    await screen.findByText(/generating/i);

    // Resolve fetch
    resolveFetch(null);

    await screen.findByDisplayValue(returned);
    await waitFor(() => expect(screen.getByRole('button', { name: /generate cover letter/i })).toBeEnabled());
  });

  it('handles server error without rendering a letter', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bad request' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    );

    render(<CoverLetterGenerator onBack={() => {}} />);
    fillResumePaste('Resume X');
    fillJDPaste('JD Y');

    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }));

    // No output textarea appears with content
    await waitFor(() => {
      expect(screen.queryByDisplayValue(/Bad request/)).toBeNull();
    });
  });

  it('displays INSUFFICIENT_JD_METADATA error message with template in output box', async () => {
    const errorMessage = 'Could not identify the company name or role title from the job description. Please add this information at the top of the job description using this format:\n\nCompany: [Company Name]\nRole: [Role Title]\n\n[Rest of job description]';

    vi.spyOn(global, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'INSUFFICIENT_JD_METADATA',
          message: errorMessage,
          metadata: { missing: ['company', 'role_title'] }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<CoverLetterGenerator onBack={() => {}} />);
    fillResumePaste('Resume with no company info');
    fillJDPaste('Vague job description without company or role');

    fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }));

    // Error message should appear in the output textarea
    await waitFor(() => {
      const output = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
      expect(output).not.toBeNull();
      expect(output!.value).toContain('Could not identify the company name or role title');
      expect(output!.value).toContain('Company: [Company Name]');
      expect(output!.value).toContain('Role: [Role Title]');
    });
  });

  it('works with multiple realistic mock pairs (table-driven)', async () => {
    const cases = [
      {
        resume: 'PM with marketplace experience; led growth 30% YoY.',
        jd: 'Seeking PM to drive supply/demand and payments.',
        letter: 'Dear Hiring Manager,\n\nI led growth in marketplaces.\n\nSincerely,',
      },
      {
        resume: 'Data scientist; NLP, LLMs, Python, deployed models to prod.',
        jd: 'NLP scientist to improve search relevance and summarization.',
        letter: 'Hello,\n\nMy NLP work aligns with your mission.\n\nThanks,',
      },
      {
        resume: 'Frontend engineer; React, accessibility, performance, design systems.',
        jd: 'Build accessible, fast web apps and component libraries.',
        letter: 'Hi team,\n\nI build accessible systems at scale.\n\nBest,',
      },
    ];

    let call = 0;
    vi.spyOn(global, 'fetch' as any).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String((input as any)?.url || input);
      if (url.includes('/api/cover-letter/generate')) {
        const idx = call++;
        const expected = cases[idx];
        const body = JSON.parse(String(init?.body || '{}'));
        expect(body).toEqual({ resume: expected.resume, jd: expected.jd });
        return new Response(JSON.stringify({ letter: expected.letter }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 200 });
    });

    for (const c of cases) {
      const { unmount } = render(<CoverLetterGenerator onBack={() => {}} />);
      fillResumePaste(c.resume);
      fillJDPaste(c.jd);
      fireEvent.click(screen.getByRole('button', { name: /generate cover letter/i }));
      // Wait for output to render
      await screen.findByRole('button', { name: /copy/i });
      const output = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
      expect(output).not.toBeNull();
      expect(output!.value).toBe(c.letter);
      unmount();
    }
  });
});
