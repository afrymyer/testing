/**
 * Input Validation Middleware (Joi)
 *
 * Schema validation for all API query params and request bodies.
 */
const Joi = require('joi');

// Query param schemas
const ticketQuerySchema = Joi.object({
  queueId: Joi.number().integer().positive().optional(),
  queueIds: Joi.string().pattern(/^[\d,]+$/).optional(),
  maxRecords: Joi.number().integer().min(1).max(5000).default(500),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  includeCompleted: Joi.string().valid('true', 'false').optional(),
  excludeZeroHours: Joi.string().valid('true', 'false').optional(),
  enrichHours: Joi.string().valid('true', 'false').optional(),
});

const analyzeBodySchema = Joi.object({
  tickets: Joi.array().items(Joi.object()).min(1).max(2000).required(),
});

const aiAnalyzeBodySchema = Joi.object({
  tickets: Joi.array().items(Joi.object()).min(1).max(2000).required(),
});

const updatePrioritySchema = Joi.object({
  ticketIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required(),
  priority: Joi.number().integer().min(1).max(10).required(),
});

const scriptParamsSchema = Joi.object({
  type: Joi.string().valid('datto', 'pia').required(),
  filename: Joi.string().pattern(/^[a-z0-9-]+\.ps1$/).required(),
});

// Bulk script execution schema
const bulkScriptSchema = Joi.object({
  ticketIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
  scripts: Joi.array().items(Joi.object({
    type: Joi.string().valid('datto', 'pia').required(),
    filename: Joi.string().pattern(/^[a-z0-9-]+\.ps1$/).required(),
  })).min(1).max(10).required(),
});

/**
 * Express middleware factory for validating request data.
 * @param {Joi.Schema} schema
 * @param {'query'|'body'|'params'} source
 */
function validate(schema, source = 'query') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      return res.status(400).json({ error: `Validation error: ${details}` });
    }
    req[source] = value;
    next();
  };
}

module.exports = {
  validate,
  ticketQuerySchema,
  analyzeBodySchema,
  aiAnalyzeBodySchema,
  updatePrioritySchema,
  scriptParamsSchema,
  bulkScriptSchema,
};
