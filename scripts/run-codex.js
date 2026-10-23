/**
 * run-codex.js v2
 *
 * Template for calling Codex or another compatible AI service.
 *
 * Security:
 * - Never put API keys in this file.
 * - Use GitHub Actions Secret: CODEX_API_KEY
 * - Optional: CODEX_API_URL
 *
 * Requires Node.js 18+.
 */

const apiKey = process.env.CODEX_API_KEY;
const apiUrl =
  process.env.CODEX_API_URL || "https://api.openai.com/v1/responses";

if (!apiKey) {
  console.error("ERROR: CODEX_API_KEY secret is missing.");
  process.exit(1);
}

const prompt = `
You are reviewing the Hazar-job-app repository.

Perform a safe code review and report:
1. Build or runtime problems
2. TypeScript or JavaScript errors
3. Security issues
4. Dependency problems
5. Obvious configuration problems
6. Recommended fixes

Do not modify the repository.
Do not expose secrets.
Return a concise report.
`;

async function main() {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.CODEX_MODEL || "gpt-5",
        input: prompt,
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`Codex API request failed: HTTP ${response.status}`);
      console.error(text);
      process.exit(1);
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.log(text);
      return;
    }

    if (data.output_text) {
      console.log(data.output_text);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Failed to contact Codex service.");
    console.error(error.message);
    process.exit(1);
  }
}

main();
