/* tslint:disable:max-classes-per-file */

export interface Policy {
  shouldAllow(args: string[], subject: any): boolean;
  sumWith(otherPolicy: Policy): Policy;
}

export abstract class PolicyBoolean implements Policy {
  abstract shouldAllow(args: string[], subject: any): boolean;
  abstract sumWith(otherPolicy: Policy): Policy;
}

export class PolicyTrue extends PolicyBoolean {
  shouldAllow(args: string[], subject: any): boolean {
    return true;
  }

  sumWith(otherPolicy: Policy): Policy {
    return this;
  }
}

export class PolicyFalse extends PolicyBoolean {
  shouldAllow(args: string[], subject: any): boolean {
    return false;
  }

  sumWith(otherPolicy: Policy): Policy {
    return otherPolicy;
  }
}

export const POLICY_TRUE = new PolicyTrue();
export const POLICY_FALSE = new PolicyFalse();

export class PolicySet implements Policy {
  allowed: Set<string>;

  constructor(allowed: Set<string> | string[]) {
    this.allowed = new Set<string>();
    for (const item of allowed) {
      this.allowed.add(item);
    }
  }

  shouldAllow(args: string[], subject: any): boolean {
    if (args.length === 0) return false;
    const key = args[0];
    return this.allowed.has(key);
  }

  sumWith(otherPolicy: Policy): Policy {
    if (otherPolicy instanceof PolicySet) {
      const sumAllowed = new Set<string>();
      for (const item of this.allowed) {
        sumAllowed.add(item);
      }
      for (const item of otherPolicy.allowed) {
        sumAllowed.add(item);
      }
      return new PolicySet(sumAllowed);
    }
    return otherPolicy.sumWith(this);
  }
}

export class PolicyDict implements Policy {
  policies: Map<string,Policy>;

  constructor(policies?: object | Map<string,Policy> | PolicyDict) {
    this.policies = new Map<string,Policy>();
    if (policies) {
      if (policies instanceof PolicyDict) {
        policies = policies.policies;
      }
      if (policies instanceof Map) {
        for (const key of policies.keys()) {
          this.policies.set(key, policies.get(key));
        }
      } else {
        for (const key of Object.keys(policies)) {
          this.policies.set(key, policies[key]);
        }
      }
    }
  }

  shouldAllow(args: string[], subject: any): boolean {
    if (args.length === 0) return false;
    const key = args[0];
    const policy = this.policies.get(key);
    if (policy) {
      return policy.shouldAllow(args.slice(1), subject);
    }
    return false;
  }

  sumWith(otherPolicy: Policy): Policy {
    if (otherPolicy instanceof PolicyDict) {
      return this.recursiveSumWith(otherPolicy);
    }
    if (otherPolicy instanceof PolicySet) {
      return this.addAll(otherPolicy);
    }
    return otherPolicy.sumWith(this);
  }

  recursiveSumWith(otherPolicy: PolicyDict): PolicyDict {
    const otherPolicies = otherPolicy.policies;
    const newPolicies = new Map<string,Policy>(this.policies);
    for (const key of otherPolicy.policies.keys()) {
      const policy = otherPolicies.get(key);
      const currentPolicy = newPolicies.get(key);
      if (currentPolicy) {
        newPolicies.set(key, currentPolicy.sumWith(policy));
      } else {
        newPolicies.set(key, policy);
      }
    }
    return new PolicyDict(newPolicies);
  }

  addAll(otherPolicy: PolicySet): PolicyDict {
    const newPolicies = new Map<string,Policy>(this.policies);
    for (const key of Object.keys(otherPolicy.allowed)) {
      newPolicies.set(key, POLICY_TRUE);
    }
    return new PolicyDict(newPolicies);
  }

  add(key: string, policy: Policy): PolicyDict {
    const newPolicies = new Map<string,Policy>(this.policies);
    const currentPolicy = newPolicies.get(key);
    if (currentPolicy) {
      newPolicies.set(key, currentPolicy.sumWith(policy));
    } else {
      newPolicies.set(key, policy);
    }
    return new PolicyDict(newPolicies);
  }
}

export interface Permission {
  action: string;
  resourceType: string;
}

export type PolicySource = boolean | string | string[] | object;

export class RootPolicy {
  policy: Policy;

  constructor() {
    this.policy = POLICY_FALSE;
  }

  shouldAllow(permission: Permission, contextId: string, subject: any): boolean {
    return this.policy.shouldAllow(
      [contextId, permission.action, permission.resourceType], subject);
  }

  static policyFromJson(jsonPolicy: PolicySource): Policy {
    if (typeof jsonPolicy === "boolean") {
      if (jsonPolicy === true) {
        return POLICY_TRUE;
      } else {
        return POLICY_FALSE;
      }
    }
    if (typeof jsonPolicy === "string") {
      return new PolicySet([jsonPolicy]);
    }
    if (jsonPolicy instanceof Array) {
      return new PolicySet(jsonPolicy);
    }
    if (typeof jsonPolicy === "object") {
      const policies = new Map<string,Policy>();
      for (const key of Object.keys(jsonPolicy)) {
        const policy = RootPolicy.policyFromJson(jsonPolicy[key]);
        policies.set(key, policy);
      }
      return new PolicyDict(policies);
    }
    return POLICY_FALSE;
  }

  addJsonPolicyForContext(jsonPolicy: PolicySource, context: string): RootPolicy {
    const policy = RootPolicy.policyFromJson(jsonPolicy);
    return this.addPolicyForContext(policy, context);
  }

  addPolicyForContext(policy: Policy, context: string): RootPolicy {
    const policyMap = new Map<string,Policy>();
    policyMap.set(context, policy);
    const contextPolicy = new PolicyDict(policyMap);
    return this.addPolicy(contextPolicy);
  }

  addPolicy(policy: Policy): RootPolicy {
    this.policy = this.policy.sumWith(policy);
    return this;
  }
}
