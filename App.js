// // App.js
// import React, { useEffect } from 'react';
// import { View, Text } from 'react-native';
// // import { connectToMQTT } from './src/utility/mqttConfig';

// // import {
// //   connectMQTT,
// //   sendMessage,
// //   disconnectMQTT,
// // } from './Helper/mqttHelper';
// import Paho  from 'paho-mqtt';  // npm install paho-mqtt

// const MQTT_BROKER = 'iot.croprigate.com'; 
// const MQTT_PORT = 8083; // Use WebSocket port (not 27187)
// const MQTT_USER = 'trumen_user';
// const MQTT_PASSWORD = 'Trumen@9930';
// const TOPIC = 'WeightMeasuring/I/1';

// // Create unique client ID
// const clientId = 'rn_client_' + Math.random().toString(16).substr(2, 8);

// // Create MQTT client (use WebSocket path)
// const client = new Paho.MQTT.Client(
//   MQTT_BROKER,
//   MQTT_PORT,
//   '/mqtt', // important for websocket connections
//   clientId
// );

// // --- Connection Lost Handler ---
// client.onConnectionLost = (responseObject) => {
//   if (responseObject.errorCode !== 0) {
//     console.error('🔌 Connection Lost:', responseObject.errorMessage);
//   }
// };

// // --- Message Arrived Handler ---
// client.onMessageArrived = (message) => {
//   console.log(`📩 Message Arrived [${message.destinationName}]: ${message.payloadString}`);
// };

// // --- Connect to Broker ---
// export const connectMQTT = () => {
//   const options = {
//     useSSL: false, // change to true if broker supports wss://
//     userName: MQTT_USER,
//     password: MQTT_PASSWORD,
//     timeout: 10,
//     onSuccess: () => {
//       console.log('✅ Connected to MQTT broker!');
//       // Subscribe to your topic
//       client.subscribe(TOPIC);
//       console.log(`📡 Subscribed to ${TOPIC}`);

//       // Publish a test message
//       const message = new Paho.MQTT.Message('Hello from React Native!');
//       message.destinationName = TOPIC;
//       client.send(message);
//     },
//     onFailure: (error) => {
//       console.error('❌ Connection failed:', error.errorMessage);
//     },
//   };

//   client.connect(options);
// };

// // --- Send Message Function ---
// export const sendMessage = (msg) => {
//   if (client.isConnected()) {
//     const message = new Paho.MQTT.Message(msg);
//     message.destinationName = TOPIC;
//     client.send(message);
//     console.log('📤 Sent:', msg);
//   } else {
//     console.warn('⚠️ MQTT client not connected');
//   }
// };

// // --- Disconnect Function ---
// export const disconnectMQTT = () => {
//   if (client.isConnected()) {
//     client.disconnect();
//     console.log('🔴 Disconnected from MQTT broker');
//   }
// };


// export default function App() {
//   // const [mqttStatus, setMqttStatus] = useState(false);
//   // const [mqttMsg, setMqttMsg] = useState('');

//   // useEffect(() => {
//   //   const client = connectToMQTT();

//   //   // Clean up when leaving the screen
//   //   return () => {
//   //     if (client) {
//   //       client.end();
//   //       console.log('🔌 Disconnected from MQTT');
//   //     }
//   //   };
//   // }, []);

//   // useEffect(() => {
//   //   connectMQTT(setMqttMsg, setMqttStatus);
//   //   return () => {
//   //     disconnectMQTT();
//   //   };
//   // }, []);

//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>React Native MQTT Example</Text>
//     </View>
//   );
// }

import React from "react";
import StackNavigator from "./src/navigation/StackNavigator";

const App = () => {
  return <StackNavigator />;
};

export default App;