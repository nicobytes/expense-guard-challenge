// Loads and searches a company's expense policy for the search_policy tool.
import { POLICIES, type tCompanyPolicy, type tPolicyRule } from "./policies.js";

export function getCompanyPolicy(companyId: string): tCompanyPolicy {
  const resolved = POLICIES[companyId];
  if (!resolved) {
    throw new Error(
      `Unknown company_id "${companyId}". No expense policy is configured.`
    );
  }
  return resolved;
}

function selectRules(
  policy: tCompanyPolicy,
  topic: string | undefined
): tPolicyRule[] {
  if (!topic) {
    return policy.rules;
  }
  const q = topic.toLowerCase();
  const matchesTopic = (rule: tPolicyRule) =>
    rule.category.toLowerCase().includes(q) ||
    rule.text.toLowerCase().includes(q);
  const hits = policy.rules.filter(matchesTopic);
  return hits.length > 0 ? hits : policy.rules;
}

export function searchPolicy(
  companyId: string,
  topic: string | undefined
): { company_name: string; rules: string } {
  const policy = getCompanyPolicy(companyId);
  const rules = selectRules(policy, topic);
  return { company_name: policy.company_name, rules: formatRules(rules) };
}

export function formatRules(rules: tPolicyRule[]): string {
  return rules
    .map((rule) => `[${rule.id}] (${rule.category}) ${rule.text}`)
    .join("\n");
}
