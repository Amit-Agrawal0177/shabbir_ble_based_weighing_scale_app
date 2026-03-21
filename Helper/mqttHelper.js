// import MQTT from 'sp-react-native-mqtt';

// const MQTT_BROKER = 'mqtt://iot.croprigate.com';
// const MQTT_PORT = 27187;
// const MQTT_USER = 'trumen_user';
// const MQTT_PASSWORD = 'Trumen@9930';
// const TOPIC = 'WeightMeasuring/I/1'; 

// let client;
// let connectionCallback = null;
// let messageCallback = null;


// const connectMQTT = (onMessage, onConnectionStatus) => {
//     MQTT.createClient({
//       uri: `${MQTT_BROKER}:${MQTT_PORT}`,
//       clientId: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
//       user: MQTT_USER,
//       pass: MQTT_PASSWORD,
//       auth: true,
//     })
//       .then(function (client) {
//         client = client;

//         connectionCallback = onConnectionStatus;
//         messageCallback = onMessage;

//         client.on('connect', function () {
//             console.log('Connected to MQTT');
//             if (connectionCallback) connectionCallback(true);
            
//             client.subscribe(TOPIC, 0);
//             client.publish('data', 'test', 0, false);
//         });

//         client.on('message', function (data) {
//             console.log(`Received message from ${data.topic}: ${data.data.toString()}`);
//             if (messageCallback) {
//                 messageCallback(data.data.toString());
//             }
//         });

//         client.on('closed', function () {
//           console.log('mqtt.event.closed');
//           if (connectionCallback) connectionCallback(false);
//         });

//         client.on('error', function (msg) {
//           console.log('mqtt.event.error', msg);
//           if (connectionCallback) connectionCallback(false);
//         });

//         client.connect();
//       })
//       .catch(function (err) {
//         console.log(err);
//         if (connectionCallback) connectionCallback(false);
//       });
// };

// const sendMessage = (message) => {
//     if (client) {
//         client.publish(TOPIC, message);
//     } else {
//         console.error('MQTT client not connected');
//     }
// };

// const disconnectMQTT = () => {
//     if (client) {
//         client.end();
//         console.log('MQTT Disconnected');
//     }
// };

// export { connectMQTT, sendMessage, disconnectMQTT };


// import init from 'react_native_mqtt';

// init({
//   size: 10000,
//   storageBackend: AsyncStorage,
//   defaultExpires: 1000 * 3600 * 24,
//   enableCache: true,
//   sync: {},
// });

// const MQTT_BROKER = 'iot.croprigate.com';
// const MQTT_PORT = 27187;
// const MQTT_USER = 'trumen_user';
// const MQTT_PASSWORD = 'Trumen@9930';
// const TOPIC = 'WeightMeasuring/I/1';

// // Define callback functions for MQTT events
// function onConnect() {
//   console.log("Connected to MQTT broker!");
//   // Publish a message after successful connection
//   const message = new Paho.MQTT.Message("Hello from React Native!");
//   message.destinationName = "/test/topic"; // Topic to publish to
//   client.send(message);
// }

// function onConnectionLost(responseObject) {
//   if (responseObject.errorCode !== 0) {
//     console.log("Connection lost:", responseObject.errorMessage);
//   }
// }

// function onMessageArrived(message) {
//   console.log("Message arrived on topic:", message.destinationName);
//   console.log("Payload:", message.payloadString);
// }

// // Create an MQTT client instance
// const brokerHost = 'broker.hivemq.com'; // Example public broker
// const brokerPort = 8000; // WebSocket port
// const clientId = 'react_native_client_' + Math.random().toString(16).substr(2, 8); // Unique client ID

// const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, clientId);

// // Assign event handlers
// client.onConnectionLost = onConnectionLost;
// client.onMessageArrived = onMessageArrived;

// // Connect to the MQTT broker
// client.connect({
//   userName: MQTT_USER,
//   password: MQTT_PASSWORD,
//   onSuccess: onConnect,
//   onFailure: (err) => console.log("Connection failed:", err),
// });

// // Example of subscribing to a topic (can be done after connection)
// client.subscribe("/test/topic");

// export { connectMQTT, sendMessage, disconnectMQTT };