import test from "node:test";
import assert from "node:assert/strict";
import { tutorProfile } from "../assets/js/data/tutor-profile.js";

test("tutor profile keeps the supplied identity and Zalo contact", () => {
  assert.equal(tutorProfile.fullName, "Trần Thanh Tùng");
  assert.equal(tutorProfile.birthYear, "2004");
  assert.equal(tutorProfile.experience, "4 năm kinh nghiệm dạy gia sư");
  assert.equal(tutorProfile.contact.number, "0943943151");
  assert.equal(tutorProfile.contact.url, "https://zalo.me/0943943151");
});

test("tutor profile exposes only the two supplied teaching formats", () => {
  assert.deepEqual(tutorProfile.teachingFormats, [
    "Dạy trực tiếp tại khu vực Hà Nội",
    "Dạy trực tuyến (Online)"
  ]);
});
