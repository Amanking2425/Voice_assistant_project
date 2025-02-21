import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, ScrollView, StyleSheet } from 'react-native';
import Voice from '@react-native-voice/voice';
import axios from 'axios';

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [actions, setActions] = useState({ tasks: [], dates: [] });
    const [email, setEmail] = useState('');

    useEffect(() => {
        Voice.onSpeechResults = (event) => {
            setTranscription(event.value[0]);
        };

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const startRecording = async () => {
        try {
            await Voice.start('en-US');
            setIsRecording(true);
        } catch (error) {
            console.error(error);
        }
    };

    const stopRecording = async () => {
        try {
            await Voice.stop();
            setIsRecording(false);
            sendAudioToBackend();
        } catch (error) {
            console.error(error);
        }
    };

    const sendAudioToBackend = async () => {
        try {
            const response = await axios.post('http://localhost:5000/upload', {
                audio: transcription,
            });
            setActions(response.data.actions);
        } catch (error) {
            console.error(error);
        }
    };

    const sendEmail = async () => {
        try {
            await axios.post('http://localhost:5000/send-email', {
                email,
                summary: transcription,
            });
            alert('Email sent successfully!');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Meeting Assistant</Text>
            <Button
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                onPress={isRecording ? stopRecording : startRecording}
            />
            <Text style={styles.subtitle}>Transcription:</Text>
            <TextInput
                style={styles.transcriptionBox}
                multiline
                value={transcription}
                onChangeText={setTranscription}
            />
            <Text style={styles.subtitle}>Extracted Actions:</Text>
            <Text>Tasks: {actions.tasks.join(', ')}</Text>
            <Text>Dates: {actions.dates.join(', ')}</Text>
            <TextInput
                style={styles.emailInput}
                placeholder="Enter email to send summary"
                value={email}
                onChangeText={setEmail}
            />
            <Button title="Send Email" onPress={sendEmail} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    transcriptionBox: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginTop: 10,
        height: 100,
    },
    emailInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginTop: 10,
    },
});

export default App;