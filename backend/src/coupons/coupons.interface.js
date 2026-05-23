const service = require('./coupons.service');

module.exports = {
  validateAndApplyCoupon: service.validateAndApplyCoupon,
  previewCoupon:          service.previewCoupon,
  removeCouponFromOrder:  service.removeCouponFromOrder,
};
