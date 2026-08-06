const { join } = require("path");

/**
 * Puppeteer downloads Chrome into $HOME/.cache/puppeteer by default. Render
 * builds and runs in different containers and only carries the project
 * directory across, so a browser cached under $HOME is gone by the time the
 * server starts and launch() fails. Keeping the cache inside the project makes
 * it survive into the runtime environment.
 */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
