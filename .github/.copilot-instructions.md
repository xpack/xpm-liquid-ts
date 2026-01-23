# Copilot Instructions

## Language and Tone

- Use British English spelling and grammar (e.g., "behaviour", "colour", "organise", "analyse", "favour", "innitialise", etc.)
- Maintain a professional and formal tone in all generated content
- Avoid colloquialisms, slang, or informal expressions
- Avoid humour, jokes, or casual remarks
- Use clear, precise, and professional language appropriate for technical documentation
- Avoid contractions (e.g., use "do not" instead of "don't")
- Use the Oxford comma in lists for clarity
- Maintain consistency in terminology throughout the codebase
- Prefer "folder" to "directory"

## Code Style

- Follow the existing ESlint TypeScript conventions in this project (`typescript-eslint` rules)
- Use consistent formatting and naming conventions based on prettier and ESLint configurations
- Add comprehensive TSDoc comments accepted by API Extractor
- Document all classes, methods, properties, parameters, and return types
- Document private and protected members as well
- Keep the line length below 80 characters
- If the code already includes documentation, review and possibly improve it
- Preserve the `// eslint-disable-next-line` comments when present
- Use `@remarks` for additional detailed notes or explanations within TSDoc comments; this should be placed after the summary and before any tags
- Use `@param` and `@returns` tags appropriately in TSDoc comments; place `@param` tags immediately after the summary and before `@returns`
- Use `@throws {@link ExceptionName}` for exceptions and place the descriptions on the next line; place these tags after `@returns`
- Precede `@throws` tags with an empty line, and place the description on the next line
- At the very end of the TSDoc comment block, after an empty line, add `@public` tags for exported classes and public members; similarly add `@internal` tags for non-exported classes and private members.
- When generating lists in TSDoc comments, separate items by empty lines, since api-extractor cannot read mardown lists yet.

## Folder Structure

- `/src`: Contains the TypeScript source code
- `/dist`: Contains the compiled JavaScript output
- `/tests`: Contains the test suites and test cases
- `/website`: Contains the project documentation and guides
