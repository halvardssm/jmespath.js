import { join, resolve } from "@std/path";
import { assertEquals, assertThrows } from "@std/assert";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { search } = require("../jmespath.cjs");


type ComplianceTestCases = {
  expression: string;
  result: unknown;
  error?: string;
};
type ComplianceTest = {
  // deno-lint-ignore no-explicit-any
  given: Record<string, any>;
  cases: ComplianceTestCases[];
};
type ComplianceTestFile = ComplianceTest[];

// Compliance tests that aren't supported yet.
const notImplementedYet: string[] = [];

const testSrcPath = resolve("test/compliance");

const listings = Deno.readDirSync("test/compliance");

for (const listing of listings) {
  if (
    listing.isFile && listing.name.endsWith(".json") &&
    !notImplementedYet.includes(listing.name)
  ) {
    const filename = join(testSrcPath, listing.name);

    const contentRaw = Deno.readTextFileSync(filename);
    const content: ComplianceTestFile = JSON.parse(contentRaw);

    for (const [i, spec] of content.entries()) {
      Deno.test(`Compliance > suite ${i} for '${listing.name}'`, async (t) => {
        const { given, cases } = spec;
        for (const [j, testCase] of cases.entries()) {
          if (testCase.error) {
            await t.step("should throw error for test " + j, () => {
              assertThrows(
                () => {
                  search(given, testCase.expression);
                },
                Error,
              );
            });
          } else {
            await t.step(
              `should pass test ${j} expression: ${testCase.expression}`,
              () => {
                assertEquals(
                  search(given, testCase.expression),
                  testCase.result,
                );
              },
            );
          }
        }
      });
    }
  }
}
