import fs from 'fs';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Ensure it loads from the backend root

const API_KEY = process.env.GOOGLE_TTS_API_KEY;

if (!API_KEY) {
    console.error('GOOGLE_TTS_API_KEY not found in .env');
    process.exit(1);
}

const text = "Welcome to Verdict. This is a sample of my voice. I will be narrating your videos.";

async function synthesizeText(voiceName, gender, outputFile) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

    // Determine language code from voice name (e.g., en-US-Journey-F -> en-US)
    const languageCode = voiceName.split('-').slice(0, 2).join('-');

    const requestBody = {
        input: { text: text },
        voice: { languageCode: languageCode, name: voiceName, ssmlGender: gender },
        audioConfig: { audioEncoding: 'MP3' }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
        }

        const data = await response.json();

        if (data.audioContent) {
            const buffer = Buffer.from(data.audioContent, 'base64');
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(outputFile, buffer, 'binary');
            console.log(`Audio content written to file: ${outputFile}`);
        } else {
            console.error(`Failed to get audio content for ${voiceName}`);
        }

    } catch (error) {
        console.error(`Error synthesizing ${voiceName}:`, error);
    }
}

async function main() {
    console.log("Generating samples for different Google TTS voices...\n");

    const voicesToTest = [
        // Standard Voices (Low Model)
        { name: 'en-US-Standard-A', gender: 'MALE', file: 'standard_male.mp3' },
        { name: 'en-US-Standard-C', gender: 'FEMALE', file: 'standard_female.mp3' },
        { name: 'en-US-Standard-E', gender: 'FEMALE', file: 'standard_female_2.mp3' },

        // Journey Voices (High Model - highly expressive)
        { name: 'en-US-Journey-D', gender: 'MALE', file: 'journey_male.mp3' },
        { name: 'en-US-Journey-F', gender: 'FEMALE', file: 'journey_female.mp3' },
        { name: 'en-US-Journey-O', gender: 'FEMALE', file: 'journey_female_2.mp3' }
    ];

    for (const voice of voicesToTest) {
        console.log(`Testing ${voice.name} (${voice.gender})...`);
        await synthesizeText(voice.name, voice.gender, voice.file);
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\nDone generating samples.");
}

main();
