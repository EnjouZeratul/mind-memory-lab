import assert from "node:assert/strict";
import test from "node:test";
import { parseDuckDuckGoInstantAnswer } from "./duckduckgo.js";

test("parseDuckDuckGoInstantAnswer 摘要与 RelatedTopics", () => {
  const hits = parseDuckDuckGoInstantAnswer(
    {
      Heading: "Test",
      AbstractText: "Alpha summary text.",
      AbstractURL: "https://example.com/a",
      RelatedTopics: [
        { Text: "One - first hit body", FirstURL: "https://example.com/1" },
        { Topics: [{ Text: "Nested - inner", FirstURL: "https://example.com/n" }] },
      ],
    },
    10,
  );
  assert.equal(hits[0]?.title, "Test");
  assert.ok(hits[0]?.snippet.includes("Alpha"));
  assert.equal(hits[1]?.url, "https://example.com/1");
  assert.ok(hits.some((h) => h.url === "https://example.com/n"));
});
