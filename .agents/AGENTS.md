# Project Rules

## Artifact Generation
Whenever the user asks to "save this as an artifact" or generate a document/report as an artifact:
1. The file name MUST include the title of the document, the current date, and the current time (e.g., `Title_YYYY_MM_DD_HH_MM.docx`).
2. The file MUST be generated in `.docx` or `.pdf` format. Do not just save a `.md` file if the user requests an artifact report. Use a custom script with a library like `docx` to generate the file.
3. Save the generated `.docx` or `.pdf` file in the conversation's artifact folder or the project root as appropriate, and provide a link to the user.

## Deployment & Staging Release Workflow
1. When code modifications and testing are completed, push changes ONLY to the `staging` branch.
2. Notify the user immediately once pushed to `staging` so they can inspect and preview the changes on the preview/staging deployment, request adjustments, or confirm.
3. NEVER merge `staging` into `main` or deploy to the live production site without the user's explicit confirmation and approval.
