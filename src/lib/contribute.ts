export type ContributeType = 'bug' | 'feature' | 'edit' | 'code';

const BASE_URL = 'https://github.com/benjaminshoemaker/job_seeker_toolkit';

function getEditPathForLocation(pathname: string): string | null {
  // Map routes to source files
  switch (pathname) {
    case '/':
      return 'src/App.tsx';
    case '/tools/cover-letter':
      return 'src/tools/CoverLetterPageV2.tsx';
    case '/tools/company-research':
      return 'src/tools/CompanyResearchPage.tsx';
    default:
      return null;
  }
}

export function openContribute(type: ContributeType) {
  switch (type) {
    case 'bug':
      window.open(`${BASE_URL}/issues/new?template=bug_report.md`, '_blank');
      break;
    case 'feature':
      window.open(`${BASE_URL}/issues/new?template=feature_request.md`, '_blank');
      break;
    case 'edit':
      {
        const file = typeof window !== 'undefined' ? getEditPathForLocation(window.location.pathname) : null;
        const target = file ? `${BASE_URL}/edit/main/${file}` : `${BASE_URL}`;
        window.open(target, '_blank');
      }
      break;
    case 'code':
    default:
      window.open(BASE_URL, '_blank');
  }
}

export const communityLinks = {
  discussions: `${BASE_URL}/discussions`,
  repo: BASE_URL,
};
