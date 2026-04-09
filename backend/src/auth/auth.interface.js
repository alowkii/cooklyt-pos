// The ONLY way other modules touch auth data.
// Never import auth.repository or auth.service directly from outside this module.
const service = require("./auth.service");

module.exports = {
  getUserById: (userId) => service.me(userId),
};
