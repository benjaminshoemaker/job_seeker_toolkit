## Why build this?
There are many options to generate cover letters; none of them have all of the following:
- Do not require an acccount
- Free
- Use genAI
- Save time with easy import of JD & Resume

This tool makes it easy to import a resume & job description and have generative AI write a detailed & evidence-based cover letter.

## Basic functionality
- **Inputs**: The user provides a resume and a job description (JD).
- **Input Methods**: Users can upload files, paste text directly, or import from a URL.
- **Generate Action**: Upon clicking the "Generate" button, the system processes the inputs to create a tailored cover letter.
- **Output Location**: The generated cover letter appears in the designated output area on the interface.

## How the prompt works
The goal of this system is to create professional cover letters based solely on the provided resume and job description, ensuring accuracy and relevance without fabricating information.

### Generation flow
- **Phase A — Extract + Validate**:
  - Extracts key metadata from the JD, including:
    - Company name
    - Role title
    - Location (if applicable)
    - Product or strategy details
  - Validates extracted data to ensure:
    - Company name is legitimate (excluding placeholders)
    - Role title includes a profession noun
  - If validation fails, an error message is returned.

- **Phase B — Compose**:
  - Generates a cover letter body only if validation is successful.
  - Adheres to constraints such as:
    - Length of 180–240 words
    - 2–3 paragraphs
    - Employer-first framing
    - Uses facts from the resume and JD without fabrication.

### Humanity touch
- The output must include:
  - One unique detail from the resume that an AI might overlook.
  - A specific connection to the company's mission or product based on the JD.
  - A brief, authentic line that feels human and not templated.

### AI style filter
- Banned patterns and style constraints include:
  - No em dashes, ellipses, or exclamation marks.
  - Limited use of semicolons and adverbs ending in "-ly".
  - Avoidance of boilerplate phrases and certain buzzwords.
  - Restriction on overused sentence starters and transitional phrases.

### Quality checks
- The output must meet the following criteria:
  - References to company, role title, and product or strategy detail.
  - Use of quantified results or specific qualitative achievements from the resume.
  - Integration of at least one specific detail from the JD.
  - Compliance with word count and paragraph constraints.
  - No fabrication or direct copying of resume bullets.

## Evidence
- Tailoring increases callbacks.
	- [2019 field experiment](https://www.resumego.net/research/cover-letters/) found tailored cover letters yielded ~50% more interviews than no letter, and generic letters underperformed tailored ones.
- Managers still read letters. A [2023 survey](https://resumegenius.com/blog/cover-letter-help/cover-letter-statistics) of 625 U.S. hiring managers reports 83% read cover letters and 73% read them even when optional. In a [June 2024 survey](https://zety.com/blog/recruiting-preferences) of 753 recruiters by Zety - 81% report rejecting candidates based solely on their cover letters.
- [Quantified outcomes matter.](https://high5test.com/resume-statistics/?utm_source=chatgpt.com) Measurables are a differentiator and absence of metrics is a dealbreaker for many.
- [AI has flooded pipelines with generic text.](https://www.ft.com/content/facac60f-dbe7-4889-b76a-7ec1dc1f2e2c "AI has flooded pipelines with generic text.") Recruiters report "sea of sameness", low-quality AI letters, and rising skepticism, so specificity and verifiable detail carry more weight.

---

*You can contribute and improve the prompt by using the "Contribute" button at the top of the page.*
