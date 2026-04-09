const { ValidationError } = require("../errors");

// Pass a schema object: { fieldName: { required, type } }
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }

      if (value !== undefined && rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join(", ")));
    }

    next();
  };
}

module.exports = { validate };
