const fs = require('fs');
const files = ['package-lock.json', 'functions/package-lock.json'];
files.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Deleted ${file}`);
    } else {
        console.log(`${file} does not exist`);
    }
});
