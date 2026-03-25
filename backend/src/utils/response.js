exports.ok = (res, data, message = "Thành công", status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

exports.fail = (res, message = "Có lỗi xảy ra", status = 400, errors = null) => {
  return res.status(status).json({ success: false, message, errors });
};
