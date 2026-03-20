import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { prisma } from "../../lib/prisma.js";
import { getMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query",
      details: parsed.error.issues,
    });
    return;
  }

  const limit = Math.min(parsed.data.rateLimit ?? 50, MAX_LIMIT);

  try {
    const data = await prisma.match.findMany({
      take: limit ?? 50,
      orderBy: {
        startTime: "desc",
      },
    });
    res.status(200).json({
      message: "Query successful",
      data: {
        data,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch data",
      details: JSON.stringify(e),
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid paylod",
      details: parsed.error.issues,
    });
  }
  try {
    const new_match = await prisma.match.create({
      data: {
        ...parsed.data,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        homeScore: req.body.homeScore ?? 0,
        awayScore: req.body.awayScore ?? 0,
        status: getMatchStatus(req.body.startTime, req.body.endTime),
      },
    });

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(new_match);
    }

    res.status(201).json({
      message: "Match created successfully",
      data: new_match,
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to create match.",
      details: JSON.stringify(e),
    });
  }
});
