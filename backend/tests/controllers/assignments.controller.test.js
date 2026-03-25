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

describe("assignments.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("create rejects missing required fields", async () => {
    const req = createMockReq({
      body: { magv: "GV01", mamon: "", mahocky: "HK1" }
    });
    const res = createMockRes();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("create inserts assignment when all rules pass", async () => {
    const req = createMockReq({
      body: {
        magv: "GV01",
        mamon: "M01",
        mahocky: "HK1",
        ngayday: "2024-03-01",
        tietbatdau: 1,
        tietketthuc: 3
      }
    });
    const res = createMockRes();

    queueDbResponses(
      [[{ magv: "GV01" }]],
      [[{ mamon: "M01", tenmon: "NodeJS", sotiet: 30 }]],
      [[{ mahocky: "HK1", ngaybatdau: "2024-01-01", ngayketthuc: "2024-05-01" }]],
      [[{ total: 0 }]],
      [[]],
      [[]],
      [[{ total: 0 }]],
      [{ insertId: 5 }],
      [[{ id: 5, magv: "GV01", mamon: "M01", soTietPhanCong: 3 }]]
    );

    await controller.create(req, res);

    expect(db.query).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining("INSERT INTO assignments"),
      ["GV01", "M01", "HK1", "2024-03-01", 1, 3]
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 5, magv: "GV01", mamon: "M01", soTietPhanCong: 3 }
      })
    );
  });

  test("update rejects scheduling conflict", async () => {
    const req = createMockReq({
      params: { id: 1 },
      body: { tietbatdau: 2, tietketthuc: 4 }
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
      [[{ id: 2, tietbatdau: 3, tietketthuc: 5 }]],
      [[{ total: 0 }]]
    );

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("update persists assignment when rules pass", async () => {
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
