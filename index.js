const express = require('express');
const cors = require('cors');
const multer = require('multer');
const speech = require('@google-cloud/speech');
const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase
const firestore = new Firestore();

// Initialize Google Speech-to-Text client
const speechClient = new speech.SpeechClient();

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint to handle audio upload and transcription
app.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        if (!audioFile) {
            return res.status(400).send('No audio file uploaded.');
        }

        // Transcribe audio using Google Speech-to-Text API
        const [response] = await speechClient.recognize({
            audio: {
                content: audioFile.buffer.toString('base64'),
            },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
        });

        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        // Extract actions (basic example)
        const actions = extractActions(transcription);

        // Save transcription and actions to Firestore
        const docRef = await firestore.collection('meetings').add({
            transcription,
            actions,
            timestamp: new Date(),
        });

        res.status(200).json({ transcription, actions, id: docRef.id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing audio.');
    }
});

// Function to extract actions (basic implementation)
function extractActions(text) {
    const tasks = text.match(/(?:we need to|please do|action item:)\s*(.+?)(?:\.|$)/gi) || [];
    const dates = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4})\b/gi) || [];
    return { tasks, dates };
}

// Endpoint to send email with meeting summary
app.post('/send-email', async (req, res) => {
    const { email, summary } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-email-password',
        },
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Meeting Summary',
        text: summary,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            res.status(500).send('Error sending email.');
        } else {
            res.status(200).send('Email sent: ' + info.response);
        }
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});