## Why build this?
There are many options to generate cover letters; none of them have all of the following:
- Do not require an acccount
- Free
- Use genAI
- Save time with easy import of JD & Resume

This tool makes it easy to import a resume & job description and have generative AI write a detailed & evidence-based cover letter. 

## Basic functionality
- Inputs
	- Resume: Upload a PDF/DOCX for text extraction or paste/edit your resume text.
	- Job description: Import from a posting URL (auto-extracts text) or paste/edit the description.
- Generation flow
	- When you click Generate, the app sends your resume and the job description to the backend.
	- The backend calls the AI model with a structured prompt that emphasizes alignment to the role.
	- The resulting draft appears in the right-hand panel for you to review and edit.

## How the prompt works
Purpose: generate short, targeted cover letters that lift callback rates. It enforces correct JD targeting, proof from your resume, and a human voice while stripping common AI tells.

### Generation flow
- Phase A: JD metadata. It lifts company, role title, location, and one product or strategy phrase as exact substrings. It normalizes lightly, then validates. Placeholders like “Confidential” are rejected. If company or title is missing, it stops and returns a clear error.
- Phase B: Composition. It writes 180–240 words in 2–3 paragraphs only if Phase A passed. It must name the company and role in sentence one, include the JD product or strategy phrase, and prove fit with at least two quantified results from your resume. If your resume lacks two numbers, it either adds a scale indicator or returns an evidence error.

### Humanity touch
- Exactly one unusual, concrete resume detail.
- One real tie to the company’s mission or product, grounded in the JD.
- One brief authentic voice line. Natural, specific, not templated.

### AI style filter
- Bans em dashes, ellipses, exclamation marks, and rhetorical questions. Semicolons at most one.
- Digits for 2 or more and for metrics. No tildes, plus signs, or approximate glyphs unless already in the resume.
- Deletes boilerplate phrases and cliché claims unless backed by a metric in the same paragraph.
- Limits overused transitions and adverbs to keep rhythm varied.

### Quality checks
- Must reference company, role title, and the JD product or strategy detail.
- Must include two quantified results or one number plus one scale indicator.
- Must integrate at least one specific JD detail.
- No fabrication. No copy and paste from the resume.

## Evidence
- Tailoring increases callbacks. 
	- [2019 field experiment](https://www.resumego.net/research/cover-letters/) found tailored cover letters yielded ~50% more interviews than no letter, and generic letters underperformed tailored ones.
- Managers still read letters. A [2023 survey](https://resumegenius.com/blog/cover-letter-help/cover-letter-statistics) of 625 U.S. hiring managers reports 83% read cover letters and 73% read them even when optional. In a [June 2024 survey](https://zety.com/blog/recruiting-preferences) of 753 recruiters by Zety - 81% report rejecting candidates based solely on their cover letters.
- [Quantified outcomes matter.](https://high5test.com/resume-statistics/?utm_source=chatgpt.com) Measurables are a differentiator and absence of metrics is a dealbreaker for many.
- [AI has flooded pipelines with generic text.](https://www.ft.com/content/facac60f-dbe7-4889-b76a-7ec1dc1f2e2c "AI has flooded pipelines with generic text.") Recruiters report "sea of sameness", low-quality AI letters, and rising skepticism, so specificity and verifiable detail carry more weight.