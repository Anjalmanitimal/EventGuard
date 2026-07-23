const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

const PASSWORD_MIN_LENGTH = 8;

// Returns a list of unmet requirements (empty = valid). Used both to
// generate the 400 error message and to drive live strength feedback
// on the register form via the same rules on both sides.
function getPasswordIssues(password) {
  const value = typeof password === 'string' ? password : '';
  const issues = [];
  if (value.length < PASSWORD_MIN_LENGTH) issues.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  if (!/[a-z]/.test(value)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(value)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(value)) issues.push('a number');
  if (!/[^A-Za-z0-9]/.test(value)) issues.push('a symbol');
  return issues;
}

function isValidPassword(password) {
  return getPasswordIssues(password).length === 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

module.exports = {
  isValidEmail,
  isValidPassword,
  getPasswordIssues,
  isNonEmptyString,
  isValidDate,
};
