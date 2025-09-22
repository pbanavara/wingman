/**
 * Tool Service (scaffold)
 *
 * Central registry for function tools used by chat/supervisor agents.
 * - Register tool definitions (JSON schema) and execution handlers
 * - Provide the `tools` array to pass to model requests
 * - Resolve and append tool call outputs to a request body
 *
 * This is a scaffold: flesh out types/handlers as you add real tools.
 */

export type ToolDefinition = {
  type: 'function';
  name: string;
  description?: string;
  // JSON Schema for tool parameters (compatible with OpenAI function tools)
  parameters: Record<string, any>;
};

export type ToolExecutor = (args: any) => Promise<any> | any;

export type FunctionCallItem = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string; // JSON string per Responses API shape
};

export type FunctionCallOutputItem = {
  type: 'function_call_output';
  call_id: string;
  output: string; // JSON string
};

export type ResponsesApiBody = {
  model: string;
  input: Array<any>; // Realtime/Responses API input items
  tools?: ToolDefinition[];
  parallel_tool_calls?: boolean;
};

export type ResponsesApiResponse = {
  error?: unknown;
  output?: Array<any>; // Items including `function_call` and `message`
};

export class ToolService {
  private definitions: ToolDefinition[] = [];
  private executors = new Map<string, ToolExecutor>();

  register(definition: ToolDefinition, executor: ToolExecutor) {
    this.definitions.push(definition);
    this.executors.set(definition.name, executor);
  }

  getTools(): ToolDefinition[] {
    return [...this.definitions];
  }

  has(name: string): boolean {
    return this.executors.has(name);
  }

  async execute(name: string, args: any): Promise<any> {
    const fn = this.executors.get(name);
    if (!fn) {
      // Graceful default: unknown tools return a simple result
      return { result: true };
    }
    return await fn(args);
  }

  /**
   * Parses function calls from a Responses API response, executes them using
   * registered handlers, and appends both call and output items to the body.
   *
   * Returns true if any tool calls were processed; false otherwise.
   */
  async applyToolCallsToBody(
    body: ResponsesApiBody,
    response: ResponsesApiResponse,
    addBreadcrumb?: (title: string, data?: any) => void,
  ): Promise<boolean> {
    const outputItems: any[] = response?.output ?? [];
    const functionCalls: FunctionCallItem[] = outputItems.filter(
      (item: any) => item?.type === 'function_call',
    );

    if (functionCalls.length === 0) return false;

    for (const call of functionCalls) {
      const { name, call_id } = call;
      let args: any = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        args = {};
      }

      if (addBreadcrumb) addBreadcrumb(`[tool] call: ${name}`, args);

      const result = await this.execute(name, args);

      if (addBreadcrumb) addBreadcrumb(`[tool] result: ${name}`, result);

      const callItem: FunctionCallItem = {
        type: 'function_call',
        call_id,
        name,
        arguments: call.arguments ?? '{}',
      };

      const outputItem: FunctionCallOutputItem = {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(result ?? {}),
      };

      body.input.push(callItem, outputItem);
    }

    return true;
  }
}

// Default singleton instance to use across the app
export const toolService = new ToolService();

// Example scaffolds (uncomment and customize as you add real tools)
// toolService.register(
//   {
//     type: 'function',
//     name: 'exampleTool',
//     description: 'Example tool that echoes input.',
//     parameters: {
//       type: 'object',
//       properties: { message: { type: 'string' } },
//       required: ['message'],
//       additionalProperties: false,
//     },
//   },
//   async ({ message }) => ({ echoed: message })
// );

