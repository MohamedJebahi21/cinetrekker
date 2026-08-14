interface TrustedHTML {
  toString(): string;
}

interface TrustedScript {
  toString(): string;
}

interface TrustedScriptURL {
  toString(): string;
}

interface TrustedTypePolicyOptions {
  createHTML?: (input: string, ...arguments_: unknown[]) => string | TrustedHTML;
  createScript?: (input: string, ...arguments_: unknown[]) => string | TrustedScript;
  createScriptURL?: (
    input: string,
    ...arguments_: unknown[]
  ) => string | TrustedScriptURL;
}

interface TrustedTypePolicy {
  createHTML(input: string, ...arguments_: unknown[]): TrustedHTML;
  createScript(input: string, ...arguments_: unknown[]): TrustedScript;
  createScriptURL(input: string, ...arguments_: unknown[]): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
  createPolicy(
    policyName: string,
    policyOptions: TrustedTypePolicyOptions,
  ): TrustedTypePolicy;
}

interface Window {
  trustedTypes?: TrustedTypePolicyFactory;
}
