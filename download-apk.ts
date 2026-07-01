import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const destPath = path.join(process.cwd(), "FlixZone_v4.5.2_Pro_Elite.apk");
const sourceUrl = "https://github.com/FossifyOrg/App-Launcher/releases/download/v1.0.1/app-launcher.apk";

function downloadFile(url: string, dest: string) {
  console.log(`Starting download from: ${url}`);
  const tempDest = dest + ".tmp";
  const file = fs.createWriteStream(tempDest);

  function get(currentUrl: string, depth = 0) {
    if (depth > 10) {
      file.close();
      fs.unlink(tempDest, () => {});
      console.error("Error: Too many redirects.");
      process.exit(1);
    }

    const client = currentUrl.startsWith("https") ? https : http;
    client.get(currentUrl, (response) => {
      const { statusCode } = response;
      console.log(`[Depth ${depth}] URL: ${currentUrl} => Status: ${statusCode}`);

      // Handle redirects
      if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          let resolvedUrl = redirectUrl;
          if (!redirectUrl.startsWith("http")) {
            const urlObj = new URL(currentUrl);
            resolvedUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          console.log(`Following redirect to: ${resolvedUrl}`);
          get(resolvedUrl, depth + 1);
          return;
        }
      }

      if (statusCode !== 200) {
        file.close();
        fs.unlink(tempDest, () => {});
        console.error(`Error: Server returned status code ${statusCode}`);
        process.exit(1);
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        // Rename temp to dest
        fs.renameSync(tempDest, dest);
        const stats = fs.statSync(dest);
        console.log(`Download finished! Cached to: ${dest}`);
        console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        process.exit(0);
      });
    }).on("error", (err) => {
      file.close();
      fs.unlink(tempDest, () => {});
      console.error("Error during download:", err);
      process.exit(1);
    });
  }

  get(url);
}

downloadFile(sourceUrl, destPath);
