jest.mock("../../src/config/db", () => ({
  query: jest.fn()
}));

const db = require("../../src/config/db");
const controller = require("../../src/controllers/reports.controller");
const { createMockReq, createMockRes } = require("../helpers/http");

describe("unit: reports.globalSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns merged search results from all entities", async () => {
    const req = createMockReq({ query: { keyword: "Node" } });
    const res = createMockRes();

    db.query
      .mockResolvedValueOnce([[{ id: "GV01", label: "Nguyen Van A", type: "teacher" }]])
      .mockResolvedValueOnce([[{ id: "M01", label: "NodeJS", type: "subject" }]])
      .mockResolvedValueOnce([[{ id: "HK1", label: "Hoc ky 1", type: "semester" }]])
      .mockResolvedValueOnce([[{ id: "1", label: "Nguyen Van A - NodeJS - 2024-03-01", type: "assignment" }]]);

    await controller.globalSearch(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          teachers: [{ id: "GV01", label: "Nguyen Van A", type: "teacher" }],
          subjects: [{ id: "M01", label: "NodeJS", type: "subject" }],
          semesters: [{ id: "HK1", label: "Hoc ky 1", type: "semester" }],
          assignments: [{ id: "1", label: "Nguyen Van A - NodeJS - 2024-03-01", type: "assignment" }]
        }
      })
    );
  });
});
