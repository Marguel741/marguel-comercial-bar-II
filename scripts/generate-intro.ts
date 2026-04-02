import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey) {
  console.error("API Key not found in environment variables (checked GEMINI_API_KEY and API_KEY).");
  console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('API')));
  process.exit(1);
}

console.log("Using API Key: " + (process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "API_KEY"));

const ai = new GoogleGenAI({ apiKey });

async function generateIntro() {
  console.log("Starting video generation...");
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: "Cinematic logo intro animation for 'Marguel Group'. Dark gradient background, premium corporate style. Large, bold, minimalist letters 'M' and 'G' appear in the center, drawn stroke by stroke with a vector drawing effect. After MG is formed, the text 'Marguel Group' fades in below, smaller, elegant, spaced letters. Subtle glow and light sweep effect on the letters. Slight camera zoom-in. Futuristic, professional, luxury brand look. 4k resolution, high quality.",
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16' // Mobile portrait for splash screen
      }
    });

    console.log("Video generation in progress...");
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
      console.log("Still generating...");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      console.error("No video URI returned.");
      return;
    }

    console.log("Video generated. Downloading from:", videoUri);

    const response = await fetch(videoUri, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error("Failed to download video:", response.statusText);
      return;
    }

    const buffer = await response.arrayBuffer();
    const outputPath = path.resolve("public/assets/intro.mp4");
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log("Video saved to:", outputPath);

  } catch (error) {
    console.error("Error generating video:", error);
  }
}

generateIntro();
