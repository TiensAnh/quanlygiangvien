exports.isEmpty = (value) => value === undefined || value === null || String(value).trim() === "";

exports.validateRequired = (fields = {}, names = {}) => {
  const errors = [];
  Object.keys(fields).forEach((key) => {
    if (exports.isEmpty(fields[key])) {
      errors.push(`${names[key] || key} không được để trống`);
    }
  });
  return errors;
};

exports.isValidPhone = (phone) => /^\d{9,11}$/.test(String(phone || ""));

exports.toInt = (value) => Number.parseInt(value, 10);
