import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { curriculumTopics } from "../assets/js/data/curriculum.js";
import { getDocumentForTopic } from "../assets/js/data/document-mappings.js";

const calculusTopicIds = ["CD12", "CD13", "CD14"];

test("the new CD12-CD14 PDF is available and matches its verified source", () => {
  const source = getDocumentForTopic("CD12");
  const file = resolve(source.filePath);

  assert.equal(existsSync(file), true);
  assert.equal(source.pageCount, 49);
  assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase(), source.sourceSha256);
  assert.equal(source.sourceSha256, "4E65F476DA0A1B817A05B6E829737100B753A2E5219236F719ACAB016F221E59");
});

test("CD12, CD13 and CD14 map every catalog exercise to a valid PDF page", () => {
  for (const topicId of calculusTopicIds) {
    const topic = curriculumTopics.find((item) => item.id === topicId);
    const source = getDocumentForTopic(topicId);
    const expectedCodes = topic.exerciseTypes.map((item) => item.code);

    assert.deepEqual(Object.keys(source.exercisePages), expectedCodes);
    assert.ok(Object.values(source.exercisePages).every((page) => page >= source.pageStart && page <= source.pageEnd));
    assert.equal(source.availabilityStatus, "available");
  }

  assert.deepEqual([getDocumentForTopic("CD12").pageStart, getDocumentForTopic("CD13").pageStart, getDocumentForTopic("CD14").pageStart], [3, 19, 34]);
  assert.equal(getDocumentForTopic("CD11"), null);
});
