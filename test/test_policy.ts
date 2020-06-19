import test from 'ava';
import * as rbac from '../src/scoped-rbac';

const dummyResourceType = "resourceType shouldn't matter for this test";
const dummySubject = { description: "subject instance shouldn't matter for htis test" };
const permissionOne = { action: "GET", resourceType: "One" };
const permissionTwo = { action: "GET", resourceType: "Two" };
const permissionSuperUserOnly = { action: "NEVER", resourceType: dummyResourceType };

function policyFor(context: string, jsonPolicy: rbac.PolicySource) {
  const rootPolicy = new rbac.RootPolicy();
  rootPolicy.addJsonPolicyForContext(jsonPolicy, context);
  return rootPolicy;
}

test.skip('empty policy', t => {
  const policyObject = {};
  let policy = policyFor("a", policyObject);
  t.false(policy.shouldAllow(permissionOne, "a", dummySubject));
  t.false(policy.shouldAllow(permissionOne, "b", dummySubject));
  t.false(policy.shouldAllow(permissionSuperUserOnly, "a", dummySubject));
  policy = policyFor("a", [])
  t.false(policy.shouldAllow(permissionOne, "a", dummySubject));
  t.false(policy.shouldAllow(permissionOne, "b", dummySubject));
  t.false(policy.shouldAllow(permissionSuperUserOnly, "a", dummySubject));
});

test.skip('all allowed', t => {
  const policy = policyFor("a", true);
  t.true(policy.shouldAllow(permissionOne, "a", dummySubject));
  t.true(policy.shouldAllow(permissionSuperUserOnly, "a", dummySubject));
  t.false(policy.shouldAllow(permissionOne, "b", dummySubject));
  t.false(policy.shouldAllow(permissionSuperUserOnly, "b", dummySubject));
});

test.skip('string allowed', t => {
  const policy = policyFor("a", "GET");
  t.true(policy.shouldAllow(permissionOne, "a", dummySubject));
  t.false(policy.shouldAllow(permissionSuperUserOnly, "a", dummySubject));
  t.false(policy.shouldAllow(permissionOne, "b", dummySubject));
  t.false(policy.shouldAllow(permissionSuperUserOnly, "b", dummySubject));
});

test.skip('list allowed', t => {
  const policy = policyFor("a", [ "GET", "POST" ]);
  t.true(policy.shouldAllow(
    {action: "GET", resourceType: dummyResourceType}, "a", dummySubject));
  t.true(policy.shouldAllow(
    {action: "POST", resourceType: dummyResourceType}, "a", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: dummyResourceType}, "a", dummySubject));
  t.false(policy.shouldAllow(
    {action: "GET", resourceType: dummyResourceType}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "POST", resourceType: dummyResourceType}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: dummyResourceType}, "b", dummySubject));
});

test('with paths', t => {
  const policy = policyFor("a",
    {"GET": true, "PUT": ["ThingOne", "ThingTwo"], "DELETE": "ThingOne"});

  t.true(policy.shouldAllow(
    {action: "GET", resourceType: "ThingOne"}, "a", dummySubject));
  t.true(policy.shouldAllow(
    {action: "GET", resourceType: "ThingTwo"}, "a", dummySubject));
  t.true(policy.shouldAllow(
    {action: "GET", resourceType: "ThingThree"}, "a", dummySubject));

  t.true(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingOne"}, "a", dummySubject));
  t.true(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingTwo"}, "a", dummySubject));
  t.false(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingThree"}, "a", dummySubject));

  t.true(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingOne"}, "a", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingTwo"}, "a", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingThree"}, "a", dummySubject));

  t.false(policy.shouldAllow(permissionSuperUserOnly, "a", dummySubject));

  t.false(policy.shouldAllow(
    {action: "GET", resourceType: "ThingOne"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "GET", resourceType: "ThingTwo"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "GET", resourceType: "ThingThree"}, "b", dummySubject));

  t.false(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingOne"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingTwo"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "PUT", resourceType: "ThingThree"}, "b", dummySubject));

  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingOne"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingTwo"}, "b", dummySubject));
  t.false(policy.shouldAllow(
    {action: "DELETE", resourceType: "ThingThree"}, "b", dummySubject));

  t.false(policy.shouldAllow(permissionSuperUserOnly, "b", dummySubject));
});
