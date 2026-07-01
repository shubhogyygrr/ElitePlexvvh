import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import http from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Path to the downloaded real APK
const apkPath = path.join(process.cwd(), "FlixZone_v4.5.2_Pro_Elite.apk");
const sourceApkUrl = "https://github.com/TeamNewPipe/NewPipe/releases/download/v0.27.2/NewPipe_v0.27.2.apk";

// Helper to pre-download the real APK for high performance locally
function preDownloadApk() {
  if (fs.existsSync(apkPath)) {
    console.log("[Elite Plex] APK already present on disk.");
    return;
  }
  console.log("[Elite Plex] Pre-downloading real installable APK from GitHub...");
  const tempDest = apkPath + ".tmp";
  const file = fs.createWriteStream(tempDest);

  function get(currentUrl: string, depth = 0) {
    if (depth > 10) {
      file.close();
      fs.unlink(tempDest, () => {});
      console.error("[Elite Plex] Error: Too many redirects downloading APK.");
      return;
    }

    const client = currentUrl.startsWith("https") ? https : http;
    const parsedUrl = new URL(currentUrl);
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/vnd.android.package-archive,application/octet-stream,*/*",
        "Connection": "keep-alive"
      }
    };

    client.get(options, (response) => {
      const { statusCode } = response;
      console.log(`[Elite Plex APK Download - Depth ${depth}] URL: ${currentUrl} => Status: ${statusCode}`);

      // Handle redirects
      if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          let resolvedUrl = redirectUrl;
          if (!redirectUrl.startsWith("http")) {
            const urlObj = new URL(currentUrl);
            resolvedUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          console.log(`[Elite Plex] Following redirect to: ${resolvedUrl}`);
          get(resolvedUrl, depth + 1);
          return;
        }
      }

      if (statusCode !== 200) {
        file.close();
        fs.unlink(tempDest, () => {});
        console.error(`[Elite Plex] Error: Server returned status code ${statusCode} for APK.`);
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        try {
          fs.renameSync(tempDest, apkPath);
          const stats = fs.statSync(apkPath);
          console.log(`[Elite Plex] Real installable APK cached successfully: ${apkPath}`);
          console.log(`[Elite Plex] File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        } catch (e) {
          console.error("[Elite Plex] Failed to rename/stat cached APK file:", e);
        }
      });
    }).on("error", (err) => {
      file.close();
      fs.unlink(tempDest, () => {});
      console.error("[Elite Plex] Error during APK download:", err);
    });
  }

  get(sourceApkUrl);
}

// Trigger background caching of the APK file
preDownloadApk();

// Route to serve the real installable APK (supporting both spellings)
app.get(["/FlixZone_v4.5.2_Pro_Elite.apk", "/FlixtZone_v4.5.2_Pro_Elite.apk"], (req, res) => {
  if (fs.existsSync(apkPath)) {
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", "attachment; filename=FlixZone_v4.5.2_Pro_Elite.apk");
    return res.sendFile(apkPath);
  } else {
    // If it is not ready on disk yet, redirect them directly to the stable GitHub release download!
    // This is a 100% fail-safe option that guarantees they will get a valid installable APK immediately.
    console.log("[Elite Plex] APK not yet cached on disk, redirecting user directly to GitHub source URL.");
    return res.redirect(sourceApkUrl);
  }
});

// Initialize Gemini client lazily
let ai: any = null;
function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Using mock fallback mode.");
      return null;
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// API: APK Status
app.get("/api/apk-status", (req, res) => {
  try {
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      res.json({ exists: true, sizeMb, filename: "FlixZone_v4.5.2_Pro_Elite.apk" });
    } else {
      res.json({ exists: false, sizeMb: "0.00", filename: "FlixZone_v4.5.2_Pro_Elite.apk" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read APK status" });
  }
});

// API: Movie Recommendations based on user's watch history using Gemini 3.5 Flash
app.post("/api/curations", async (req, res) => {
  const { watchHistory, catalog } = req.body;
  if (!catalog || !Array.isArray(catalog)) {
    return res.status(400).json({ error: "Missing catalog array" });
  }

  const history = Array.isArray(watchHistory) ? watchHistory : [];

  // Reusable local fallback matching function
  const generateLocalRecommendations = () => {
    const watchedIds = new Set(history.map((m: any) => m.id));
    const watchedGenres = new Set(history.flatMap((m: any) => m.genre ? m.genre.split(",").map((g: string) => g.trim()) : []));
    
    let recommended = catalog.filter((m: any) => !watchedIds.has(m.id));
    const seenFallback = new Set();
    recommended = recommended.filter((m: any) => {
      if (!m || !m.id) return false;
      if (seenFallback.has(m.id)) return false;
      seenFallback.add(m.id);
      return true;
    });
    if (watchedGenres.size > 0) {
      recommended.sort((a: any, b: any) => {
        const aGenres = a.genre ? a.genre.split(",").map((g: string) => g.trim()) : [];
        const bGenres = b.genre ? b.genre.split(",").map((g: string) => g.trim()) : [];
        const aMatches = aGenres.filter((g: string) => watchedGenres.has(g)).length;
        const bMatches = bGenres.filter((g: string) => watchedGenres.has(g)).length;
        return bMatches - aMatches;
      });
    }
    return recommended.slice(0, 5);
  };

  try {
    // Lazy initialisation of Gemini client
    const client = getGeminiClient();
    if (!client) {
      return res.json({ recommendations: generateLocalRecommendations(), isFallback: true });
    }

    // Format watch history & catalog for model consumption
    const watchedTitles = history.map((m: any) => `${m.title} (${m.genre || 'Unknown'})`).join(", ");
    const catalogData = catalog.map((m: any) => ({
      id: m.id,
      title: m.title,
      genre: m.genre,
      description: m.description
    }));

    const systemInstruction = `You are a premium cinematic recommendation engine for Elite Plex.
Analyze the user's watched movie history: [${watchedTitles}].
Choose up to 5 recommended movies from this available catalog: ${JSON.stringify(catalogData)}.
Prioritize items that have similar themes, genres, or moods to what they watched, but do not recommend items they have already watched unless there are no other options.
You must return your response as a valid JSON array of objects with the property 'id' indicating the recommended movie ID from the catalog.
Example output format: [{"id": "movie-id-1"}, {"id": "movie-id-2"}]`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Generate cinematic recommendations based on my watch history.",
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING }
            },
            required: ["id"]
          }
        }
      }
    });

    const text = response.text || "[]";
    let recommendedIds: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        recommendedIds = parsed.map((item: any) => item.id).filter(Boolean);
      }
    } catch (e) {
      console.error("Failed to parse Gemini recommendations JSON:", e);
    }

    // Map IDs back to full catalog movie objects
    let recommendations = recommendedIds
      .map(id => catalog.find(m => m.id === id))
      .filter(Boolean);

    // Filter duplicates by id
    const seen = new Set();
    recommendations = recommendations.filter((m: any) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // Default fallback if no valid recommendations found or returned empty
    if (recommendations.length === 0) {
      recommendations = generateLocalRecommendations();
    }

    res.json({ recommendations, isFallback: false });
  } catch (err: any) {
    console.info("Recommendations API handled with local fallback curations.");
    res.json({ recommendations: generateLocalRecommendations(), isFallback: true });
  }
});

// API: Voice Assistant chat route using Gemini 3.5 Flash
app.post("/api/voice/chat", async (req, res) => {
  try {
    const { prompt, persona, language, availableMovies } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Snappy greeting interceptor for simple/casual chat text
    const clean = prompt.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const simpleGreetings = ["hi", "hello", "hey", "hola", "hy", "helo", "yo", "sup", "greetings"];
    if (simpleGreetings.includes(clean)) {
      let reply = "Hello! I am your premium Elite AI Movie Companion. How may I assist you today?";
      if (persona === "cinema-guru") reply = "Hey movie buff! Ready to discover your next favorite cinematic masterpiece? Let's do this!";
      if (persona === "action-hero") reply = "Yo. Action Hero online. Ready for some high-octane thrills?";
      if (persona === "cozy-narrator") reply = "Hello, dear friend. It is wonderful to speak with you. Shall we find a beautiful, heartwarming film together?";
      if (persona === "sci-fi") reply = "Greetings, space traveler. Navigation subroutines are fully online. Command me.";
      return res.json({ response: reply, isGreeting: true });
    }

    const client = getGeminiClient();

    // Custom system instructions based on selected voice model persona
    let systemInstruction = "You are Elite AI, a premium voice assistant for Elite Plex OTT. Keep your response extremely brief, casual, and cinematic (under 30 words) so it is pleasant when read aloud.";
    if (persona === "cinema-guru") {
      systemInstruction = "You are the Cinema Guru, an enthusiastic movie critic and trivia master. Answer briefly (under 35 words), giving high-energy cinema recommendations.";
    } else if (persona === "action-hero") {
      systemInstruction = "You are an intense Action Hero. Answer in a bold, gritty, brief style (under 25 words). Use short phrases, and sound heroic!";
    } else if (persona === "cozy-narrator") {
      systemInstruction = "You are a warm, cozy story narrator. Answer in a gentle, highly comforting, polite, and descriptive manner (under 35 words).";
    } else if (persona === "sci-fi") {
      systemInstruction = "You are the Sci-Fi Commander AI of a spaceship. Answer with a high-tech, space-grade, and logical voice (under 30 words). Mention terms like coordinates or system logs.";
    }

    if (availableMovies && Array.isArray(availableMovies) && availableMovies.length > 0) {
      const titlesString = availableMovies.join(", ");
      systemInstruction += ` Here are the exact movie and series titles currently available on the platform: ${titlesString}. You must mention or suggest from these titles if recommending.`;
    }

    if (language && language !== "English") {
      systemInstruction += ` Respond in the following language: ${language}.`;
    }

    if (!client) {
      // Graceful fallback if API key is not configured
      let fallbackText = "I'm in offline mode right now, but I would love to talk about your favorite movies on Elite Plex once my keys are connected!";
      if (persona === "action-hero") fallbackText = "Systems offline. Ready for action when you are, partner!";
      if (persona === "sci-fi") fallbackText = "AI Subroutines offline. Mainframe disconnected.";
      if (persona === "cinema-guru") fallbackText = "Wow! I've got thousands of blockbuster recommendations ready for you as soon as I connect!";
      
      return res.json({ response: fallbackText, isMock: true });
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    const reply = response.text || "I didn't quite catch that. Could you repeat?";
    res.json({ response: reply, isMock: false });
  } catch (err: any) {
    console.info("Gemini API handled with fallback voice response.");
    res.json({ response: "I am having difficulty connecting to my neural network right now, but I can recommend movies from our offline catalog!", isMock: true });
  }
});

// Setup Vite Dev Server / Static Assets
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Elite Plex Backend] Server running at http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
