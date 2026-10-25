import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidVietnamesePhone,
  normalizeVietnamesePhone,
  submitRegistration,
  validateRegistrationData
} from "../assets/js/components/registration-form.js";
import {
  isRegistrationConfigured,
  learningRegistrationConfig
} from "../assets/js/data/registration-config.js";

const configured = Object.freeze({ provider: "formspree", endpoint: "https://formspree.io/f/example" });
const validData = Object.freeze({
  fullName: "Nguyễn Minh Anh",
  grade: "11",
  phone: "+84 912 345 678",
  format: "Online",
  note: "Cần tư vấn lịch học"
});

test("Vietnamese phone numbers are normalized and validated", () => {
  assert.equal(normalizeVietnamesePhone("+84 912.345.678"), "0912345678");
  assert.equal(normalizeVietnamesePhone("84-912-345-678"), "0912345678");
  assert.equal(isValidVietnamesePhone("0912 345 678"), true);
  assert.equal(isValidVietnamesePhone("0123"), false);
});

test("registration requires only name, Grade 10-12 and a valid phone", () => {
  assert.deepEqual(validateRegistrationData(validData), {});
  assert.deepEqual(validateRegistrationData({ fullName: "", grade: "9", phone: "123" }), {
    fullName: "Em vui lòng nhập họ và tên.",
    grade: "Em vui lòng chọn lớp đang học.",
    phone: "Số điện thoại chưa đúng định dạng Việt Nam."
  });
});

test("registration provider accepts only a configured HTTPS Formspree endpoint", () => {
  assert.equal(isRegistrationConfigured(configured), true);
  assert.equal(isRegistrationConfigured({ provider: "formspree", endpoint: "" }), false);
  assert.equal(isRegistrationConfigured({ provider: "formspree", endpoint: "http://formspree.io/f/example" }), false);
  assert.equal(isRegistrationConfigured({ provider: "custom", endpoint: "https://example.com/form" }), false);
});

test("learning contact and availability use one verified configuration source", () => {
  assert.equal(learningRegistrationConfig.contact.url, "https://zalo.me/0943943151");
  assert.equal(learningRegistrationConfig.contact.displayNumber, "0943 943 151");
  assert.equal(learningRegistrationConfig.offlineServiceArea, "Hà Nội");
  assert.deepEqual(learningRegistrationConfig.supportedLearningFormats, ["online", "offline"]);
});

test("successful registration requires a confirmed provider response", async () => {
  let request;
  const response = await submitRegistration(validData, {
    config: configured,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true };
    }
  });
  assert.equal(response.ok, true);
  assert.equal(request.url, configured.endpoint);
  assert.equal(request.options.method, "POST");
  assert.match(request.options.body, /0912345678/);
});

test("registration never reports success without configuration or after provider failure", async () => {
  await assert.rejects(
    submitRegistration(validData, { config: { provider: "formspree", endpoint: "" } }),
    /REGISTRATION_NOT_CONFIGURED/
  );
  await assert.rejects(
    submitRegistration(validData, { config: configured, fetchImpl: async () => ({ ok: false }) }),
    /REGISTRATION_DELIVERY_FAILED/
  );
});
