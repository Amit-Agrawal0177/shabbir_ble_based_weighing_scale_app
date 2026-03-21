
import { Buffer } from 'buffer';
import TcpSocket from 'react-native-tcp-socket';

import mqtt from 'mqtt/dist/mqtt';
// const mqtt = require('mqtt/dist/mqtt');

global.Buffer = global.Buffer || Buffer;
global.TcpSocket = TcpSocket;

export const connectToMQTT = () => {
    const host = "iot.croprigate.com";
    const port = 27187;
    const topic = 'WeightMeasuring/I/1';


    const options = {
        username: 'trumen_user',
        password: 'Trumen@9930',
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };

      const client = mqtt.connect(`mqtt://${host}:${port}`, options);


    client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        client.subscribe(topic, (err) => {
            if (!err) {
                console.log(`📡 Subscribed to ${topic}`);
                client.publish(topic, 'Hello from React Native!');
            }
        });
    });

    client.on('message', (topic, message) => {
        console.log(`📥 Message from ${topic}:`, message.toString());
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err);
    });

    return client;
};


// const char* mqtt_server = "iot.croprigate.com";
// const int mqtt_port = 27187;
// const char* mqtt_username = "trumen_user";
// const char* mqtt_password = "Trumen@9930";
// String mqtt_pub_topic = "WeightMeasuring/I/1";
// String mqtt_sub_topic = "WeightMeasuring/R/1";