import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";

export const commentaryRouter = Router({ mergeParams: true });
const MAX_LIMIT = 50;

commentaryRouter.get("/", async (req, res) => {
  const paramResult = matchIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      message: "Invalid Match Id",
      errors: paramResult.error.issues,
    });
    return;
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({
      message: "Invalid query",
      errors: queryResult.error.issues,
    });
    return;
  }
  try {
    const { id: matchId } = paramResult.data;
    const { limit = 10 } = queryResult.data;

    const safeLimit = Math.min(limit, MAX_LIMIT);
    const results = await prisma.commentary.findMany({
      where: {
        matchId,
      },
      take: safeLimit,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      message: "commentary fetched successful",
      data: results,
    });
  } catch (error) {
    console.error("Failed to fetch commentary", error);
    res.status(500).json({
      error: "Failed to fetch commentary",
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  try {
    const paramResult = matchIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({
        message: "Invalid match ID",
        errors: paramResult.error.issues,
      });
      return;
    }
    const { id } = paramResult.data;

    const bodyResult = createCommentarySchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        message: "Invalid Data",
        errors: bodyResult.error.issues,
      });
      return;
    }
    const data = bodyResult.data;
    const {
      minutes,
      sequence,
      period,
      eventType,
      actor,
      team,
      message,
      metadata,
      tags,
    } = data;

    const commentary = await prisma.commentary.create({
      data: {
        matchId: id,
        minute: minutes,
        sequence,
        period,
        eventType,
        actor,
        team,
        message,
        metadata: metadata || null,
        tags: tags || [],
      },
    });

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(commentary.matchId, commentary);
    }

    return res.status(201).json(commentary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
