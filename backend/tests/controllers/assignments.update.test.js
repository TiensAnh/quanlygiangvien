jest.mock("../../src/config/db", () => ({
  query: jest.fn()
}));

const db = require("../../src/config/db");
const controller = require("../../src/controllers/assignments.controller");
const { createMockReq, createMockRes } = require("../helpers/http");

function queueDbResponses(...responses) {
  responses.forEach((response) => {
    db.query.mockResolvedValueOnce(response);
  });
}

describe("unit: assignments.update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates assignment when merged payload passes all rules", async () => {
    const req = createMockReq({
      params: { id: 1 },
      body: { tietbatdau: 4, tietketthuc: 6, ngayday: "2024-03-02" }
    });
    const res = createMockRes();

    queueDbResponses(
      [[{
        id: 1,
        magv: "GV01",
        mamon: "M01",
        mahocky: "HK1",
        ngayday: "2024-03-01",
        tietbatdau: 1,
        tietketthuc: 3
      }]],
      [[{ magv: "GV01" }]],
      [[{ mamon: "M01", tenmon: "NodeJS", sotiet: 30 }]],
      [[{ mahocky: "HK1", ngaybatdau: "2024-01-01", ngayketthuc: "2024-05-01" }]],
      [[{ total: 0 }]],
      [[]],
      [[]],
      [[{ total: 0 }]],
      [{}],
      [[{ id: 1, ngayday: "2024-03-02", tietbatdau: 4, tietketthuc: 6 }]]
    );

    await controller.update(req, res);

    expect(db.query).toHaveBeenNthCalledWith(
      9,
      expect.stringContaining("UPDATE assignments"),
      ["GV01", "M01", "HK1", "2024-03-02", 4, 6, 1]
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 1, ngayday: "2024-03-02", tietbatdau: 4, tietketthuc: 6 }
      })
    );
  });
});
