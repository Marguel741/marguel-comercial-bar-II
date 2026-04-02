import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const SplashGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const generateVideo = async () => {
    setLoading(true);
    setError("");
    setStatus("Checking API Key...");

    try {
      // @ts-ignore - window.aistudio is injected by the environment
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        setStatus("Waiting for API Key selection...");
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }

      setStatus("Initializing GenAI...");
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key não encontrada. Por favor, selecione uma chave.");
      }

      let ai;
      try {
        // Verificação extra para evitar "Illegal constructor"
        if (typeof GoogleGenAI !== 'function') {
          throw new Error(`GoogleGenAI não é uma função/construtor válido. Tipo: ${typeof GoogleGenAI}`);
        }
        
        // Tenta instanciar com tratamento de erro específico para o construtor
        try {
          ai = new GoogleGenAI({ apiKey });
        } catch (constrErr: any) {
          console.error("Erro no construtor GoogleGenAI:", constrErr);
          throw new Error(`Erro ao chamar 'new GoogleGenAI': ${constrErr.message}`);
        }
      } catch (e: any) {
        console.error("Falha ao inicializar GoogleGenAI:", e);
        throw new Error(`Falha ao inicializar GenAI: ${e.message}. Verifique se a biblioteca @google/genai está carregada corretamente.`);
      }

      setStatus("Generating video... (this may take a few minutes)");
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: "Cinematic logo intro animation for 'Marguel Group'. Dark gradient background, premium corporate style. Large, bold, minimalist letters 'M' and 'G' appear in the center, drawn stroke by stroke with a vector drawing effect. After MG is formed, the text 'Marguel Group' fades in below, smaller, elegant, spaced letters. Subtle glow and light sweep effect on the letters. Slight camera zoom-in. Futuristic, professional, luxury brand look. 4k resolution, high quality.",
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
        setStatus("Still generating... " + (operation.metadata?.state || ""));
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("No video URI returned.");
      }

      // Fetch the video to display it (and allow download)
      setStatus("Downloading video...");
      const response = await fetch(videoUri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("Generation complete!");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setStatus("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Splash Screen Generator</h1>
      
      <div className="mb-6 p-4 bg-slate-100 rounded-lg">
        <p className="mb-2">This tool generates the cinematic intro video using Google's Veo model.</p>
        <p className="text-sm text-slate-600">Note: This requires a paid API key with access to Veo.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={generateVideo}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </div>

      {status && (
        <div className="mb-4 text-slate-700 font-mono">
          Status: {status}
        </div>
      )}

      {videoUrl && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Result:</h2>
          <video 
            src={videoUrl} 
            controls 
            className="w-full max-w-md mx-auto rounded-lg shadow-xl mb-4"
          />
          <a 
            href={videoUrl} 
            download="intro.mp4"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download intro.mp4
          </a>
          <p className="mt-2 text-sm text-slate-500">
            Download this file and save it to <code>public/assets/intro.mp4</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default SplashGenerator;
