// server/server.js

const express = require("express");
const cors = require("cors");
const { CosmosClient } = require("@azure/cosmos");
const http = require("http");
const socketIo = require("socket.io");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

// Cosmos DB configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID;
const containerId = process.env.COSMOS_DB_CONTAINER_ID;

const cosmosClient = new CosmosClient({ endpoint, key });
const database = cosmosClient.database(databaseId);
const container = database.container(containerId);

// Set up HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// Endpoint to fetch data (optional)
app.get("/api/map-data", async (req, res) => {
  try {
    const { resources } = await container.items.readAll().fetchAll();
    res.json(resources);
  } catch (error) {
    console.error("Error fetching data from Cosmos DB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected");

  // Optionally send initial data
  // fetchDataAndEmit();

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Function to fetch data and emit to clients
const fetchDataAndEmit = async () => {
  try {
    const { resources } = await container.items.readAll().fetchAll();
    // Transform data if necessary
    const transformedData = resources.map((item) => ({
      ...item,
      // Ensure Latitude and Longitude are strings (if they aren't already)
      Latitude: item.Latitude ? item.Latitude.toString() : "",
      Longitude: item.Longitude ? item.Longitude.toString() : "",
    }));
    io.sockets.emit("mapDataUpdate", transformedData);
  } catch (error) {
    console.error("Error fetching data from Cosmos DB:", error);
  }
};

// Set an interval to fetch data every 30 seconds
setInterval(fetchDataAndEmit, 30000);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
