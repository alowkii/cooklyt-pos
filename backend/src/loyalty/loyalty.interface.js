const service = require('./loyalty.service');

module.exports = {
  lookupCustomer:     service.lookupCustomer,
  earnPoints:         service.earnPoints,
  deductPoints:       service.deductPoints,
  validateRedemption: service.validateRedemption,
  getCustomer:        service.getCustomer,
};
