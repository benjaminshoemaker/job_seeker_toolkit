import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openContribute } from './contribute';

describe('openContribute(edit) page-aware mapping', () => {
  beforeEach(() => {
    // Mock window.open
    window.open = vi.fn() as any;
  });

  it('opens App page file for /', () => {
    window.history.pushState({}, '', '/');
    openContribute('edit');
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/github\.com\/benjaminshoemaker\/job_seeker_toolkit\/edit\/main\/src\/App\.tsx$/),
      '_blank'
    );
  });

  it('opens CoverLetterPageV2 file for /tools/cover-letter', () => {
    window.history.pushState({}, '', '/tools/cover-letter');
    openContribute('edit');
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/github\.com\/benjaminshoemaker\/job_seeker_toolkit\/edit\/main\/src\/tools\/CoverLetterPageV2\.tsx$/),
      '_blank'
    );
  });

  it('falls back to repo root for unknown routes', () => {
    window.history.pushState({}, '', '/unknown');
    openContribute('edit');
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/github\.com\/benjaminshoemaker\/job_seeker_toolkit\/?$/),
      '_blank'
    );
  });
});
