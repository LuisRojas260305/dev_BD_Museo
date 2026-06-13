/**
 * Decimal128 conversion utility - helper for converting MongoDB Decimal128
 * BSON values to plain JavaScript numbers throughout the application.
 * Handles both Mongoose Decimal128 instances and raw BSON Decimal128 values
 * returned by aggregation pipelines.
 */

/**
 * Recursively converts Decimal128 BSON values to plain JavaScript numbers.
 * Works for both Mongoose Decimal128 instances and raw BSON Decimal128
 * (as returned by aggregation pipelines).
 */
function convertDecimal128(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'Decimal128') {
      obj[key] = parseFloat(val.toString());
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      convertDecimal128(val);
    }
  });

  return obj;
}

module.exports = { convertDecimal128 };
