import { LanguageModel, Tool } from "ai";

/**
 * Numeric range constraint for model parameters
 */
interface ParameterRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Validation constraints for model parameters
 */
const PARAMETER_CONSTRAINTS: Record<string, ParameterRange> = {
  temperature: { min: 0, max: 2 },
  topP: { min: 0, max: 1 },
  presencePenalty: { min: -2, max: 2 },
  frequencyPenalty: { min: -2, max: 2 },
  maxSteps: { min: 1, max: 100 },
} as const;

/**
 * Configuration for an agent's behavior and capabilities.
 * This interface defines all customizable aspects of agent behavior including
 * model selection, tool configuration, system instructions, and generation parameters.
 */
export interface AgentConfig {
  /**
   * The language model to use for the agent
   */
  model: LanguageModel;

  /**
   * System instructions defining the agent's role and behavior
   */
  instructions?: string;

  /**
   * Tools available to the agent (optional - can be empty for text-only agents)
   */
  tools?: Record<string, Tool>;

  /**
   * Maximum number of steps the agent can take in the tool loop
   * @default 20
   */
  maxSteps?: number;

  /**
   * Control how the agent uses tools
   * - 'auto': Model decides whether to use tools
   * - 'required': Model must use at least one tool
   * - 'none': Model cannot use tools
   * - { type: 'tool', toolName: string }: Force specific tool usage
   */
  toolChoice?: "auto" | "required" | "none" | { type: "tool"; toolName: string };

  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * Temperature for generation. Controls randomness of responses.
   * Range: 0 (deterministic) to 2 (highly random). Default: 1
   */
  temperature?: number;

  /**
   * Top P (nucleus sampling) for generation.
   * Range: 0 to 1. Controls diversity via cumulative probability. Default: 1
   */
  topP?: number;

  /**
   * Presence penalty for generation.
   * Range: -2 to 2. Encourages diversity in token usage. Default: 0
   */
  presencePenalty?: number;

  /**
   * Frequency penalty for generation.
   * Range: -2 to 2. Penalizes frequent tokens. Default: 0
   */
  frequencyPenalty?: number;
}

/**
 * Options for generating a response with the agent
 */
export interface AgentGenerateOptions {
  /**
   * The user's prompt/question
   */
  prompt: string;

  /**
   * Additional context to provide to the agent
   */
  context?: string;
}

/**
 * Options for streaming a response with the agent
 */
export interface AgentStreamOptions extends AgentGenerateOptions {
  /**
   * Callback when the stream starts
   */
  onStart?: () => void;

  /**
   * Callback when the stream ends
   */
  onFinish?: () => void;

  /**
   * Callback for errors during streaming
   */
  onError?: (error: Error) => void;
}

/**
 * Result from an agent generation
 */
export interface AgentResult {
  /**
   * The final text response from the agent
   */
  text: string;

  /**
   * Steps taken by the agent (includes tool calls and responses)
   */
  steps: AgentStep[];

  /**
   * Total number of steps executed
   */
  stepCount: number;

  /**
   * Whether the agent completed successfully
   */
  completed: boolean;
}

/**
 * Represents a single step in the agent's execution
 */
export interface AgentStep {
  /**
   * Type of step
   */
  type: "text" | "tool-call" | "tool-result";

  /**
   * Step number
   */
  stepNumber: number;

  /**
   * Text content (for text steps)
   */
  text?: string;

  /**
   * Tool name (for tool steps)
   */
  toolName?: string;

  /**
   * Tool input (for tool-call steps)
   */
  toolInput?: unknown;

  /**
   * Tool output (for tool-result steps)
   */
  toolOutput?: unknown;
}

/**
 * Internal utility for parameter validation
 * @internal
 */
export function validateAgentConfig(config: Partial<AgentConfig>): void {
  const numericParams = [
    "temperature",
    "topP",
    "presencePenalty",
    "frequencyPenalty",
    "maxSteps",
  ] as const;

  for (const param of numericParams) {
    const value = config[param];
    if (value !== undefined) {
      const constraint = PARAMETER_CONSTRAINTS[param];
      if (value < constraint.min || value > constraint.max) {
        throw new RangeError(
          `Parameter '${param}' must be between ${constraint.min} and ${constraint.max}, got ${value}`
        );
      }
    }
  }

  if (config.maxSteps !== undefined && !Number.isInteger(config.maxSteps)) {
    throw new TypeError("maxSteps must be an integer");
  }
}

/**
 * Error thrown by the agent
 */
export class AgentError extends Error {
  /**
   * Unique error code for programmatic handling
   */
  readonly code: string;

  /**\n   * Original error that caused this agent error
   */
  readonly cause?: Error;

  /**
   * Step number where the error occurred (1-indexed)
   */
  readonly stepNumber?: number;

  /**
   * Timestamp when the error occurred
   */
  readonly timestamp: Date;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      stepNumber?: number;
      code?: string;
    }
  ) {
    super(message);
    this.name = "AgentError";
    this.cause = options?.cause;
    this.stepNumber = options?.stepNumber;
    this.code = options?.code ?? "AGENT_ERROR";
    this.timestamp = new Date();

    Object.setPrototypeOf(this, AgentError.prototype);
  }

  /**
   * Get a structured representation for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stepNumber: this.stepNumber,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
    };
  }
}
