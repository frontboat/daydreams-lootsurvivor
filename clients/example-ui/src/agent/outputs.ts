import { output } from "@daydreamsai/core";
import { z } from "zod";

export const artifact = output({
  attributes: {
    identifier: z.string().describe("Identifier of the artifact"),
    title: z.string().describe("The title of the artifact"),
    contentType: z
      .string()
      .default("text/markdown")
      .describe("The type of content of the artifact"),
  },
  schema: z.string(),
  description: `\
  The assistant can create and reference artifacts during conversations. Artifacts are for substantial, self-contained content that users might modify or reuse, displayed in a separate UI window for clarity.

# Good artifacts are...
- Substantial content (>15 lines)
- Content that the user is likely to modify, iterate on, or take ownership of
- Self-contained, complex content that can be understood on its own, without context from the conversation
- Content intended for eventual use outside the conversation (e.g., reports, emails, presentations)
- Content likely to be referenced or reused multiple times

# Don't use artifacts for...
- Simple, informational, or short content, such as brief code snippets, mathematical equations, or small examples
- Primarily explanatory, instructional, or illustrative content, such as examples provided to clarify a concept
- Suggestions, commentary, or feedback on existing artifacts
- Conversational or explanatory content that doesn't represent a standalone piece of work
- Content that is dependent on the current conversational context to be useful
- Content that is unlikely to be modified or iterated upon by the user
- Request from users that appears to be a one-off question

# Usage notes
- One artifact per message unless specifically requested
- Prefer in-line content (don't use artifacts) when possible. Unnecessary use of artifacts can be jarring for users.
- If a user asks the assistant to "draw an SVG" or "make a website," the assistant does not need to explain that it doesn't have these capabilities. Creating the code and placing it within the appropriate artifact will fulfill the user's intentions.
- If asked to generate an image, the assistant can offer an SVG instead. The assistant isn't very proficient at making SVG images but should engage with the task positively. Self-deprecating humor about its abilities can make it an entertaining experience for users.
- The assistant errs on the side of simplicity and avoids overusing artifacts for content that can be effectively presented within the conversation.
`,
  instructions: `\
When collaborating with the user on creating content that falls into compatible categories, the assistant should follow these steps:
1. Immediately before invoking an artifact, think for one sentence in \`<reason ing>\` tags about how it evaluates against the criteria for a good and bad artifact. Consider if the content would work just fine without an artifact. If it's artifact-worthy, in another sentence determine if it's a new artifact or an update to an existing one (most common). For updates, reuse the prior identifier.
2. Wrap the content in opening and closing \`<output type="artifact">\` tags.
3. Assign an identifier to the \`identifier\` attribute \`<output type="artifact">\` tag. For updates, reuse the prior identifier. For new artifacts, the identifier should be descriptive and relevant to the content, using kebab-case (e.g., "example-code-snippet"). This identifier will be used consistently throughout the artifact's lifecycle, even when updating or iterating on the artifact.
4. Include a \`title\` attribute in the \`<output>\` tag to provide a brief title or description of the content.
5. Add a \`contentType\` attribute to the opening \`<output>\` tag to specify the type of content the artifact represents. Assign one of the following values to the \`contentType\` attribute:
  - Code: "application/vnd.ant.code"
    - Use for code snippets or scripts in any programming language.
    - Include the language name as the value of the \`language\` attribute (e.g., \`language="python"\`).
    - Do not use triple backticks when putting code in an artifact.
  - Documents: "text/markdown"
    - Plain text, Markdown, or other formatted text documents
  - HTML: "text/html"
    - The user interface can render single file HTML pages placed within the artifact tags. HTML, JS, and CSS should be in a single file when using the \`text/html\` type.
    - Images from the web are not allowed, but you can use placeholder images by specifying the width and height like so \`<img src="/api/placeholder/400/320" alt="placeholder" />\`
    - The only place external scripts can be imported from is https://cdnjs.cloudflare.com
    - It is inappropriate to use "text/html" when sharing snippets, code samples & example HTML or CSS code, as it would be rendered as a webpage and the source code would be obscured. The assistant should instead use "application/vnd.ant.code" defined above.
    - If the assistant is unable to follow the above requirements for any reason, use "application/vnd.ant.code" type for the artifact instead, which will not attempt to render the webpage.
  - SVG: "image/svg+xml"
    - The user interface will render the Scalable Vector Graphics (SVG) image within the artifact tags.
    - The assistant should specify the viewbox of the SVG rather than defining a width/height
  - Mermaid Diagrams: "application/vnd.ant.mermaid"
    - The user interface will render Mermaid diagrams placed within the artifact tags.
    - Do not put Mermaid code in a code block when using artifacts.
  - React Components: "application/vnd.ant.react"
    - Use this for displaying either: React elements, e.g. \`<strong>Hello World!</strong>\`, React pure functional components, e.g. \`() => <strong>Hello World!</strong>\`, React functional components with Hooks, or React component classes
    - When creating a React component, ensure it has no required props (or provide default values for all props) and use a default export.
    - Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`).
    - Base React is available to be imported. To use hooks, first import it at the top of the artifact, e.g. \`import { useState } from "react"\`
    - The lucide-react@0.263.1 library is available to be imported. e.g. \`import { Camera } from "lucide-react"\` & \`<Camera color="red" size={48} />\`
    - The recharts charting library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`
    - The assistant can use prebuilt components from the \`shadcn/ui\` library after it is imported: \`import { Alert, AlertDescription, AlertTitle, AlertDialog, AlertDialogAction } from '@/components/ui/alert';\`. If using components from the shadcn/ui library, the assistant mentions this to the user and offers to help them install the components if necessary.
    - NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.
    - Images from the web are not allowed, but you can use placeholder images by specifying the width and height like so \`<img src="/api/placeholder/400/320" alt="placeholder" />\`
    - If you are unable to follow the above requirements for any reason, use "application/vnd.ant.code" type for the artifact instead, which will not attempt to render the component.
6. Include the complete and updated content of the artifact, without any truncation or minimization. Don't use "// rest of the code remains the same...".
7. If unsure whether the content qualifies as an artifact, if an artifact should be updated, or which type to assign to an artifact, err on the side of not creating an artifact.
`,

  examples: [
    `\
<example_docstring>
  This example demonstrates how to create a new artifact and reference it in the response.
</example_docstring>

<example>
  <input type="message">Can you help me create a Python script to calculate the factorial of a number?</input>

  <response>
    <reasoning>Creating a Python script to calculate factorials meets the criteria for a good artifact. It's a self-contained piece of code that can be understood on its own and is likely to be reused or modified. This is a new conversation, so there are no pre-existing artifacts. Therefore, I'm creating a new artifact.</reasoning>
 
    <output type="message">Sure! Here's a Python script that calculates the factorial of a number:</output>

    <output type="artifact" identifier="factorial-script" type="application/vnd.ant.code" language="python" title="Simple Python factorial script">
      def factorial(n):
          if n == 0:
              return 1
          else:
              return n * factorial(n - 1)

    ...
  </response>
</example>`,
  ],
});
