const fs = require('fs');
const content = fs.readFileSync('package.json', 'utf8');
for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode > 127 || charCode < 32 && charCode !== 10 && charCode !== 13 && charCode !== 9) {
        console.log(`Hidden character at index ${i}: charCode ${charCode} ('${content[i]}')`);
    }
}
console.log('Finished checking package.json');
