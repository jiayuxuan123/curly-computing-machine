const fs = require('fs');
const path = require('path');

try {
  const Parser = require('rss-parser');
  const parser = new Parser({
    customFields: {
      item: [
        ['content:encoded', 'content'],
        ['description', 'description']
      ]
    }
  });

  // Read feeds configuration
  const feedsConfigPath = path.join(__dirname, '../feeds.json');
  const feedsConfig = JSON.parse(fs.readFileSync(feedsConfigPath, 'utf8'));

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const buildData = async () => {
    console.log(`[${new Date().toISOString()}] Starting RSS feed build...`);
    
    const allItems = [];
    const feedResults = [];

    for (const feed of feedsConfig.feeds) {
      try {
        console.log(`Fetching feed: ${feed.name} (${feed.url})`);
        const parsedFeed = await parser.parseURL(feed.url);
        
        const feedData = {
          name: feed.name,
          url: feed.url,
          category: feed.category,
          lang: feed.lang,
          lastUpdated: new Date().toISOString(),
          itemCount: parsedFeed.items.length,
          status: 'success'
        };

        // Process feed items
        if (parsedFeed.items && parsedFeed.items.length > 0) {
          parsedFeed.items.forEach(item => {
            allItems.push({
              title: item.title || '',
              link: item.link || '',
              pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
              creator: item.creator || item.author || parsedFeed.title || '',
              category: feed.category,
              feedName: feed.name,
              lang: feed.lang,
              description: item.description || item.summary || '',
              content: item.content || item.description || '',
              guid: item.guid || item.link || ''
            });
          });
        }

        feedResults.push(feedData);
        console.log(`✓ Successfully fetched ${parsedFeed.items.length} items from ${feed.name}`);
      } catch (error) {
        console.error(`✗ Error fetching ${feed.name}:`, error.message);
        feedResults.push({
          name: feed.name,
          url: feed.url,
          category: feed.category,
          lang: feed.lang,
          lastUpdated: new Date().toISOString(),
          itemCount: 0,
          status: 'error',
          error: error.message
        });
      }
    }

    // Sort items by date (newest first)
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Keep only the latest 500 items
    const limitedItems = allItems.slice(0, 500);

    // Generate output data
    const outputData = {
      generatedAt: new Date().toISOString(),
      totalItems: limitedItems.length,
      feeds: feedResults,
      items: limitedItems,
      categories: [...new Set(feedsConfig.feeds.map(f => f.category))],
      languages: [...new Set(feedsConfig.feeds.map(f => f.lang))]
    };

    // Write to JSON file
    const outputPath = path.join(dataDir, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

    console.log(`\n[${new Date().toISOString()}] Build completed successfully!`);
    console.log(`Total items processed: ${limitedItems.length}`);
    console.log(`Data saved to: ${outputPath}`);

    return outputData;
  };

  buildData().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });

} catch (error) {
  // Fallback when dependencies are not installed
  console.log(`[${new Date().toISOString()}] RSS Parser not installed. Generating stub data...`);
  
  const feedsConfigPath = path.join(__dirname, '../feeds.json');
  const feedsConfig = JSON.parse(fs.readFileSync(feedsConfigPath, 'utf8'));

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const stubData = {
    generatedAt: new Date().toISOString(),
    totalItems: 0,
    feeds: feedsConfig.feeds.map(f => ({
      name: f.name,
      url: f.url,
      category: f.category,
      lang: f.lang,
      lastUpdated: new Date().toISOString(),
      itemCount: 0,
      status: 'pending'
    })),
    items: [],
    categories: [...new Set(feedsConfig.feeds.map(f => f.category))],
    languages: [...new Set(feedsConfig.feeds.map(f => f.lang))]
  };

  const outputPath = path.join(dataDir, 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify(stubData, null, 2), 'utf8');

  console.log(`Stub data generated at: ${outputPath}`);
}
