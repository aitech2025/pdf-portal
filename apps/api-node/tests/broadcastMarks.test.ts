import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { parseSheet, sanitizeParam } from "../src/routes/broadcastMarks.js";

const nodeRequire = createRequire(import.meta.url);
const XLSX = nodeRequire("xlsx") as typeof import("xlsx");

const sheetBuffer = (rows: unknown[][]): Buffer => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Marks");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

describe("parseSheet", () => {
  it("parses the standard 'X Marks' / 'X Out Of' column pairs, including the Class column", () => {
    const buffer = sheetBuffer([
      ["Student Name", "Mobile Number", "Class", "Program Name", "Maths Marks", "Maths Out Of", "Grand Total"],
      ["Ravi Kumar", "9876543210", "10", "IIT Weekly Test 1", 88, 30, 88]
    ]);

    const [row] = parseSheet(buffer);
    expect(row.valid).toBe(true);
    expect(row.className).toBe("10");
    expect(row.subjects).toEqual([{ subject: "maths", obtained: "88", outOf: "30" }]);
  });

  it("marks a row invalid when the Class column is missing", () => {
    const buffer = sheetBuffer([
      ["Student Name", "Mobile Number", "Program Name", "Maths Marks", "Maths Out Of", "Grand Total"],
      ["Ravi Kumar", "9876543210", "IIT Weekly Test 1", 88, 30, 88]
    ]);

    const [row] = parseSheet(buffer);
    expect(row.valid).toBe(false);
    expect(row.error).toBe("Missing class");
  });

  it("picks up any number of extra subject columns added to the template", () => {
    const buffer = sheetBuffer([
      [
        "Student Name", "Mobile Number", "Class", "Program Name",
        "Maths Marks", "Maths Out Of",
        "Physics Marks", "Physics Out Of",
        "Chemistry Marks", "Chemistry Out Of",
        "English Marks", "English Out Of",
        "Grand Total"
      ],
      ["Ravi Kumar", "9876543210", "10", "IIT Weekly Test 1", 88, 30, 91, 20, 79, 20, 45, 50, 303]
    ]);

    const [row] = parseSheet(buffer);
    expect(row.subjects).toEqual([
      { subject: "maths", obtained: "88", outOf: "30" },
      { subject: "physics", obtained: "91", outOf: "20" },
      { subject: "chemistry", obtained: "79", outOf: "20" },
      { subject: "english", obtained: "45", outOf: "50" }
    ]);
  });

  it("accepts bare subject columns that don't follow the 'Marks'/'Out Of' naming convention", () => {
    const buffer = sheetBuffer([
      ["Student Name", "Mobile Number", "Class", "Program Name", "Maths Marks", "Maths Out Of", "History"],
      ["Ravi Kumar", "9876543210", "10", "IIT Weekly Test 1", 88, 30, 60]
    ]);

    const [row] = parseSheet(buffer);
    expect(row.subjects).toEqual([
      { subject: "maths", obtained: "88", outOf: "30" },
      { subject: "history", obtained: "60", outOf: "?" }
    ]);
  });
});

describe("sanitizeParam", () => {
  it("strips whitespace Meta rejects from parameter values", () => {
    expect(sanitizeParam("  Priya\tS  ")).toBe("Priya S");
    expect(sanitizeParam("90\t/  100")).toBe("90 / 100");
  });

  it("removes stray 'class' wording and underscores from values like 'Class_10A'", () => {
    expect(sanitizeParam("Class_10A Weekly Test")).toBe("10A Weekly Test");
    expect(sanitizeParam("IIT_Weekly_Test_1")).toBe("IIT Weekly Test 1");
  });
});
