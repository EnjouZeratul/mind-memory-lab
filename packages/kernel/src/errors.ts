export class MindError extends Error {
  readonly code: string;
  readonly recoverable: boolean;

  constructor(code: string, message: string, recoverable = false) {
    super(message);
    this.name = "MindError";
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class ConfigurationError extends MindError {
  constructor(message: string) {
    super("CONFIGURATION", message, false);
    this.name = "ConfigurationError";
  }
}
