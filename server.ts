import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy-loaded Gemini AI client to prevent crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will run with simulated responses.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || "MOCK_KEY" });
  }
  return aiClient;
}

// 1. Alexa Simulator & Chemistry AI Router
app.post('/api/alexa-command', async (req, res) => {
  try {
    const { command, currentStatus } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command prompt is required' });
    }

    const keyAvailable = !!process.env.GEMINI_API_KEY;
    
    // Fallback simulation inside server if API key is not present or if call fails
    const runMockSelector = (cmd: string) => {
      const lower = cmd.toLowerCase();
      let reply = "I'm sorry, I'm not sure how to help with that pool request.";
      let changeState = false;
      let targetDevice = 'none';
      let targetProperty = 'none';
      let targetValue: any = null;
      let aiCoachAdvice = "";

      if (lower.includes('pump') && (lower.includes('on') || lower.includes('start'))) {
        reply = "Okay, I've turned on the pool pump.";
        changeState = true;
        targetDevice = 'pump';
        targetProperty = 'isCurrentlyOn';
        targetValue = true;
      } else if (lower.includes('pump') && (lower.includes('off') || lower.includes('stop'))) {
        reply = "Done, I've turned off the pool pump.";
        changeState = true;
        targetDevice = 'pump';
        targetProperty = 'isCurrentlyOn';
        targetValue = false;
      } else if (lower.includes('chlorinator') && (lower.includes('on') || lower.includes('start'))) {
        reply = "Done, I've started the chlorinator cycle.";
        changeState = true;
        targetDevice = 'chlorinator';
        targetProperty = 'isCurrentlyOn';
        targetValue = true;
      } else if (lower.includes('chlorinator') && (lower.includes('off') || lower.includes('stop'))) {
        reply = "Alright, I've turned off the chlorinator schedule.";
        changeState = true;
        targetDevice = 'chlorinator';
        targetProperty = 'isCurrentlyOn';
        targetValue = false;
      } else if (lower.includes('heater') && (lower.includes('on') || lower.includes('start'))) {
        reply = "Understood, I've powered on the pool heater.";
        changeState = true;
        targetDevice = 'heater';
        targetProperty = 'isCurrentlyOn';
        targetValue = true;
      } else if (lower.includes('heater') && (lower.includes('off') || lower.includes('stop'))) {
        reply = "Okay, I've turned off the pool heater.";
        changeState = true;
        targetDevice = 'heater';
        targetProperty = 'isCurrentlyOn';
        targetValue = false;
      } else if (lower.includes('heater') && (lower.includes('degree') || lower.includes('temp') || lower.includes('set to'))) {
        const match = lower.match(/(\d+)\s*degree/) || lower.match(/set to\s*(\d+)/) || lower.match(/(\d+)\s*°/);
        const targetTemp = match ? parseInt(match[1]) : 85;
        reply = `Alright, I've set the pool heater target to ${targetTemp} degrees Fahrenheit.`;
        changeState = true;
        targetDevice = 'heater';
        targetProperty = 'targetTemperature';
        targetValue = targetTemp;
      } else if (lower.includes('heater') && (lower.includes('mode') || lower.includes('eco') || lower.includes('rapid') || lower.includes('solar'))) {
        let tgtMode: 'eco' | 'rapid' | 'solar' = 'eco';
        if (lower.includes('rapid') || lower.includes('fast')) {
          tgtMode = 'rapid';
        } else if (lower.includes('solar') || lower.includes('sun')) {
          tgtMode = 'solar';
        }
        reply = `Excellent. I've switched the heater into ${tgtMode} mode.`;
        changeState = true;
        targetDevice = 'heater';
        targetProperty = 'mode';
        targetValue = tgtMode;
      } else if (lower.includes('temperature') || lower.includes('temp') || lower.includes('hot') || lower.includes('cold') || lower.includes('thermometer')) {
        const waterT = currentStatus?.waterTemp || currentStatus?.temperature || 82;
        const airT = currentStatus?.airTemp || 75;
        reply = `The thermometer reads ${waterT} degrees reference water, and ${airT} degrees air temperature.`;
        aiCoachAdvice = "Maintaining water temperature between 78°F and 86°F ensures ideal recreation comfort while suppressing excessive chemical evaporation.";
      } else if (lower.includes('pump') && (lower.includes('hour') || lower.includes('schedule'))) {
        const match = lower.match(/(\d+)\s*hour/);
        const hours = match ? parseInt(match[1]) : 8;
        reply = `Successfully set the daily pump runtime target to ${hours} hours.`;
        changeState = true;
        targetDevice = 'pump';
        targetProperty = 'dailyTargetHours';
        targetValue = hours;
      } else if (lower.includes('chlorinator') && (lower.includes('percent') || lower.includes('percent%') || lower.includes('level'))) {
        const match = lower.match(/(\d+)\s*percent/) || lower.match(/(\d+)\s*%/);
        const percent = match ? parseInt(match[1]) : 50;
        reply = `Understood. I have set the chlorinator output level to ${percent} percent.`;
        changeState = true;
        targetDevice = 'chlorinator';
        targetProperty = 'outputPercentage';
        targetValue = percent;
      } else if (lower.includes('status') || lower.includes('chemical') || lower.includes('levels')) {
        reply = `The pool is currently at pH ${currentStatus?.ph || '7.4'} and Chlorine is ${currentStatus?.chlorine || '2.0'} ppm.`;
        aiCoachAdvice = "Ensure you test your pool water twice a week to keep pH inside the 7.2 to 7.6 range for optimal comfort and sanitation.";
      } else if (lower.includes('cloudy') || lower.includes('green') || lower.includes('algae')) {
        reply = "To treat cloudy or green water, you likely have algae starting. I recommend performing a shock treatment by adding liquid chlorine or Cal-Hypo and running your pump on high speed continuously for 24 hours.";
        aiCoachAdvice = "Algae is usually caused by insufficient sanitizer (chlorine) or poor circulation. Shock the pool to elevate chlorine above 10 ppm, run the filter, and brush the walls daily.";
      } else {
        reply = `Sure, here is some quick pool advice: maintain your free chlorine between 1 to 4 ppm to prevent algae. What device would you like Alexa to control today?`;
      }

      return { reply, changeState, targetDevice, targetProperty, targetValue, aiCoachAdvice };
    };

    if (!keyAvailable) {
      const responseObj = runMockSelector(command);
      return res.json({ ...responseObj, source: 'simulator_offline_fallback' });
    }

    // Call actual Gemini API with structured instructions
    const prompt = `You are the smart voice assistant "Pool Manager" linked through Alexa Smart Home Skills and an AI Pool Maintenance Coach.
The user is talking to Alexa or asking for pool care instructions.

Current Pool Status:
- Pool Volume: ${currentStatus?.volumeGallons || 'unknown'} gallons
- pH: ${currentStatus?.ph || 7.4} (Ideal: 7.2 - 7.6)
- Free Chlorine: ${currentStatus?.chlorine || 2.0} ppm (Ideal: 1.0 - 4.0 ppm)
- Alkalinity: ${currentStatus?.alkalinity || 100} ppm (Ideal: 80 - 120 ppm)
- Cyanuric Acid (CYA): ${currentStatus?.cya || 40} ppm (Ideal: 30 - 50 ppm)
- Calcium Hardness: ${currentStatus?.calcium || 200} ppm (Ideal: 150 - 250 ppm)
- Pump Status: ${currentStatus?.pumpIsOn ? "ON" : "OFF"}, daily target hours: ${currentStatus?.pumpHours || 8}
- Chlorinator Status: ${currentStatus?.chlorinatorIsOn ? "ON" : "OFF"}, percentage: ${currentStatus?.chlorinatorPercentage || 50}
- Pool Heater Status: ${currentStatus?.heaterIsOn ? "ON" : "OFF"}, target temp: ${currentStatus?.heaterTargetTemp || 80}°F, mode: ${currentStatus?.heaterMode || 'eco'}
- Smart Thermometer Status: water temp ${currentStatus?.waterTemp || 82}°F, air temp ${currentStatus?.airTemp || 75}°F, trend: ${currentStatus?.thermometerTrend || 'stable'}

User Command/Question: "${command}"

Instructions:
Respond strictly in JSON format. Provide the following keys:
1. "reply": Standard concise voice response Alexa speaks back to the user (keep it natural, professional, and max 2 sentences).
2. "changeState": boolean indicating if a device setting in the pool states should be mutated base on this query.
3. "targetDevice": 'pump' | 'chlorinator' | 'heater' | 'none'
4. "targetProperty": 'isCurrentlyOn' | 'dailyTargetHours' | 'outputPercentage' | 'targetTemperature' | 'mode' | 'scheduleStart' | 'scheduleEnd' | 'none'
5. "targetValue": the parsed new value (e.g. true/false for isCurrentlyOn, a number for percentages, hours, or temperature, a string "HH:MM" for schedules, or "eco"|"rapid"|"solar" for heater mode).
6. "aiCoachAdvice": detailed paragraph with scientific pool advice or steps, supporting instructions for chemical adjustment or algae treatment. Give granular pool guidance if they are asking about dirty water, pool balance, stabilizer, heater usage, etc.

JSON response:`;

    const ai = getAi();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = result.text || '';
    try {
      const parsed = JSON.parse(resultText.trim());
      return res.json({ ...parsed, source: 'gemini_api' });
    } catch (parseErr) {
      console.error("Gemini output parsing failed, response text:", resultText);
      const fallback = runMockSelector(command);
      return res.json({ ...fallback, source: 'gemini_parse_fallback' });
    }

  } catch (err: any) {
    console.error("Alexa prompt route error:", err);
    res.status(500).json({ error: 'Server error processing pool voice skill command', details: err.message });
  }
});

// Serve frontend assets
async function init() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Server Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pool Manager Server running at http://0.0.0.0:${PORT}`);
  });
}

init();
