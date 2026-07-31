import { describe, expect, it } from "vitest";
import { buildMarksTemplateParams } from "../src/routes/broadcastMarks.js";

describe("buildMarksTemplateParams", () => {
  it("builds the three body params expected by the student_marks template", () => {
    const params = buildMarksTemplateParams({
      studentName: "Ravi Kumar",
      mobileNumber: "9550432743",
      subjects: [
        { subject: "Maths", marks: "88" },
        { subject: "Science", marks: "91" }
      ],
      total: "179",
      valid: true
    });

    expect(params).toEqual(["Ravi Kumar", "Maths: 88\nScience: 91", "179"]);
  });

  it("uses a safe fallback when total is missing", () => {
    const params = buildMarksTemplateParams({
      studentName: "Priya S",
      mobileNumber: "9876500011",
      subjects: [{ subject: "English", marks: "90" }],
      total: "",
      valid: true
    });

    expect(params).toEqual(["Priya S", "English: 90", "-"]);
  });
});