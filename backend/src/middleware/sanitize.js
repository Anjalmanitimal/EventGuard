const { sanitize } = require('express-mongo-sanitize');

// express-mongo-sanitize's default middleware reassigns req.query, which Express 5
// exposes as a getter-only property and throws on. Its sanitize() helper mutates
// objects in place, so sanitizing req.body directly avoids touching req.query.
function sanitizeBody(req, res, next) {
  if (req.body) {
    sanitize(req.body);
  }
  next();
}

module.exports = sanitizeBody;
