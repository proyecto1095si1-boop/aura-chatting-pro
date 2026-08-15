const fs = require('fs');
const file = 'functions/package-lock.json';
if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted ${file}`);
} else {
    console.log(`${file} does not exist`);
}
