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
The prompt was written to align with what hiring managers look for, based on evidence. Details:
- Tailoring increases callbacks. 
	- [2019 field experiment](https://www.resumego.net/research/cover-letters/) found tailored cover letters yielded ~50% more interviews than no letter, and generic letters underperformed tailored ones.
- Managers still read letters. A [2023 survey](https://resumegenius.com/blog/cover-letter-help/cover-letter-statistics) of 625 U.S. hiring managers reports 83% read cover letters and 73% read them even when optional. In a [June 2024 survey](https://zety.com/blog/recruiting-preferences) of 753 recruiters by Zety - 81% report rejecting candidates based solely on their cover letters.
- [Quantified outcomes matter.](https://high5test.com/resume-statistics/?utm_source=chatgpt.com) Measurables are a differentiator and absence of metrics is a dealbreaker for many.
- [AI has flooded pipelines with generic text.](https://www.ft.com/content/facac60f-dbe7-4889-b76a-7ec1dc1f2e2c "AI has flooded pipelines with generic text.") Recruiters report "sea of sameness", low-quality AI letters, and rising skepticism, so specificity and verifiable detail carry more weight.

The prompt optimizes for these things:
- Easy to create a cover letter
- Tailored to the job
- Emphasizes quantifiable outcomes & proof
- Avoids AI-text gotchas, cliches, boilerplate, etc. and emphasizes unique & approachable output