const fs = require('fs');

const base = [
  "password","123456","letmein","qwerty","admin123","welcome1","iloveyou",
  "monkey123","dragon2024","sunshine1","football","baseball1","trustno1",
  "superman1","batman123","princess1","shadow123","master123","hello123",
  "freedom1","whatever1","hunter123","secret123","summer123","winter123",
  "abc12345","test1234","qazwsx12","zaq1zaq1","asdf1234","1qaz2wsx",
  "michael1","jennifer","jessica1","charlie1","thomas12","robert12"
];

const suffixes = ["", "1","12","123","1234","!", "@","2023","2024","2025","#1","!!","01","007","99"];
const words = [];

base.forEach(w => {
  suffixes.forEach(s => {
    words.push(w + s);
    words.push(w.charAt(0).toUpperCase() + w.slice(1) + s);
  });
});

// pad/trim to exactly 869 entries
while (words.length < 869) {
  words.push("filler" + words.length + "x");
}
const finalList = words.slice(0, 869);

// insert the real secret at a fixed, reportable position
finalList.splice(434, 0, "ThatsSecret123"); // roughly the middle
finalList.length = 869; // keep exactly 869 total

fs.writeFileSync('wordlist.txt', finalList.join('\n'));
console.log(`wordlist.txt written with ${finalList.length} entries`);