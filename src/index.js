import express from "express";
import { prisma } from "../lib/prisma.js";

const app = express();
const port = 8000;

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    await prisma.$connect();
    res.send("Hello from the server. Prisma is connected!");
  } catch (e) {
    console.error(e);
    res.status(500).send("Error connecting to database");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
