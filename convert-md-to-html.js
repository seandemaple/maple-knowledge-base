const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

// Root folder containing all categories (in your case "getting-started")
const kbRoot = path.join(__dirname, 'getting-started');

// Recursively process folders
async function processFolder(folderPath) {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
            // Recurse into subfolders
            await processFolder(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            // Read Markdown
            const content = await fs.readFile(fullPath, 'utf8');
            const { attributes, body } = fm(content);

            // Convert to HTML
            const html = marked.parse(body);

            // Save HTML next to Markdown
            const htmlFile = fullPath.replace(/\.md$/, '.html');
            await fs.writeFile(htmlFile, html, 'utf8');

            console.log(`Converted ${entry.name} → ${path.basename(htmlFile)}`);
        }
    }
}

// Run
processFolder(kbRoot)
    .then(() => console.log('All Markdown files converted to HTML'))
    .catch(err => console.error(err));
