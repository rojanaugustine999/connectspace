// Route → Controller in one small file, to show the flow.
// Bigger features (auth, posts...) will get separate routes/, controllers/ and services/ files.
import { Router } from "express";
import { checkPostgres } from "../config/prisma.js";
import { checkMongo } from "../config/mongo.js";

const router = Router();

// GET /api/health → is the API up, and can it reach both databases?
router.get("/", async (req, res) => {
  const postgres = await checkPostgres();
  const mongo = checkMongo();
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    databases: { postgres, mongo },
  });
});

export default router;
