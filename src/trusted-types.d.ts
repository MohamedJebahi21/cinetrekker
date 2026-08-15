interface TrustedHTML {
  readonly __trustedHTMLBrand: unique symbol;
}

interface TrustedScript {
  readonly __trustedScriptBrand: unique symbol;
}

interface TrustedScriptURL {
  readonly __trustedScriptURLBrand: unique symbol;
}

interface TrustedTypePolicy {
  createHTML(input: string): TrustedHTML;
  createScript(input: string): TrustedScript;
  createScriptURL(input: string): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
  createPolicy(
    policyName: string,
    policyOptions: {
      createHTML?: (input: string) => string | TrustedHTML;
      createScript?: (input: string) => string | TrustedScript;
      createScriptURL?: (input: string) => string | TrustedScriptURL;
    },
  ): TrustedTypePolicy;
}

interface Window {
  trustedTypes?: TrustedTypePolicyFactory;
}
