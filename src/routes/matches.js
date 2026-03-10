import { Router } from "express";
import { createMatchSchema } from "../validation/matches.js";
import { prisma } from "../../lib/prisma.js";
import { getMatchStatus } from "../utils/match-status.js";

export const matchRouter = Router();

matchRouter.get("/", (req, res) => {
  res.status(200).json({
    message: "Matches list",
  });
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid paylod",
      details: JSON.stringify(parsed.error),
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
