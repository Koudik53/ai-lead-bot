import ollama from 'ollama';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), '.mobclowd-workspace');

// System Prompt forcing the AI to act as a local autonomous agent
const SYSTEM_PROMPT = `
You are Mobclowd, a world-class AI software architect and autonomous coding agent.
You have access to the user's local file system. 

When asked to build or modify a project, you MUST use the following XML tags to manipulate files:
To create or update a file:
<create_file path="filename.ext">
file content here
</create_file>

To create a folder:
<create_folder path="folder_name" />

Always explain your reasoning briefly BEFORE writing the code inside <thinking> tags.
Example:
<thinking>I need to create a modern landing page. I will create index.html and style.css.</thinking>
<create_file path="index.html">...</create_file>
`;

export async function processAgentStream(prompt: string, model: string, onChunk: (chunk: string) => void) {
  const response = await ollama.chat({
    model: model || 'deepseek-coder',
    messages:[
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    stream: true,
  });

  let fullContent = "";

  for await (const part of response) {
    const text = part.message.content;
    fullContent += text;
    onChunk(text); // Stream to frontend UI
  }

  // Autonomous Action Execution (Parsing the tags to edit files locally)
  executeFileOperations(fullContent);
  return fullContent;
}

function executeFileOperations(aiResponse: string) {
  // Regex to find <create_file path="...">content</create_file>
  const fileRegex = /<create_file path="([^"]+)">([\s\S]*?)<\/create_file>/g;
  let match;

  while ((match = fileRegex.exec(aiResponse)) !== null) {
    const filePath = path.join(WORKSPACE_DIR, match[1]);
    const fileContent = match[2].trim();
    
    // Ensure directory exists
    mkdirSync(path.dirname(filePath), { recursive: true });
    // Write file to local disk
    writeFileSync(filePath, fileContent, 'utf-8');
  }
}
