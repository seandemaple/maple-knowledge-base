const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const fm = require('front-matter');
require('dotenv').config();

// Zendesk credentials via environment variables
const subdomain = process.env.ZENDESK_SUBDOMAIN;
const email = process.env.ZENDESK_EMAIL;
const apiToken = process.env.ZENDESK_API_TOKEN;

// Root folder for your markdown articles
const kbRoot = path.join(__dirname, 'getting-started/overview/articles');

// Base API URL
const zendeskBase = `https://${subdomain}.zendesk.com/api/v2/help_center`;

async function pushArticle(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const { attributes, body } = fm(content);

  // Read the corresponding HTML file
  const htmlFilePath = filePath.replace(/\.md$/, '.html');
  const htmlBody = await fs.readFile(htmlFilePath, 'utf8');

  // Determine if we are creating a new article or updating an existing one
  const isUpdate = !!attributes.article_id;
  const locale = attributes.locale || 'en-us';
  const url = isUpdate
    ? `${zendeskBase}/articles/${attributes.article_id}.json`
    : `${zendeskBase}/${locale}/articles.json`;

  // Basic auth header
  const auth = Buffer.from(`${email}/token:${apiToken}`).toString('base64');

  // Payload includes section_id for creation
  const payload = {
    article: {
      title: attributes.title,
      body: htmlBody,
      tags: attributes.tags || [],
      locale,
      ...(isUpdate ? {} : { section_id: attributes.section_id })
    }
  };

  try {
    const method = isUpdate ? 'put' : 'post';
    const response = await axios({
      method,
      url,
      data: payload,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Pushed article: ${attributes.title}`);

    // Save the article_id back to front matter for future updates
    attributes.article_id = response.data.article.id;

    // Write updated front matter back to the markdown file
    const frontMatter = `---\n${Object.entries(attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')}\n---\n${body}`;
    await fs.writeFile(filePath, frontMatter, 'utf8');
  } catch (err) {
    console.error(
      `❌ Error pushing article: ${attributes.title}`,
      err.response?.data || err.message
    );
  }
}

async function processFolder(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) await processFolder(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) await pushArticle(fullPath);
  }
}

// Start processing
processFolder(kbRoot);
