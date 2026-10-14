import test from "node:test";
import assert from "node:assert/strict";
import { validateContactPayload, validateContactValue } from "../assets/js/domain/contact-validator.js";

test("accepts a complete valid contact payload", () => {
  const errors = validateContactPayload({
    name: "Nguyễn An",
    email: "an@example.com",
    phone: "0912 345 678",
    message: "Mình cần tư vấn lộ trình ôn thi."
  });
  assert.deepEqual(errors, { name: "", email: "", phone: "", message: "" });
});

test("keeps the optional phone field optional", () => {
  assert.equal(validateContactValue("phone", ""), "");
});

test("returns errors for malformed required values", () => {
  const errors = validateContactPayload({ name: "A", email: "sai", phone: "123", message: "ngắn" });
  assert.ok(Object.values(errors).every(Boolean));
});
