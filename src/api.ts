import { Router } from "express";
import { redisClient } from "./app";
import gamelist from "./gamelist.json";
import { titleIdManager } from "./titleIdManager";

const router = Router();

router.get("/", async (_req, res, _next) => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  const result = await redisClient.json.get("games");

  if (result == null || typeof result != "object") {
    return res.sendStatus(404);
  }

  const games = Object.entries(result)
    .map(([_, game]) => game)
    .filter(game => {
      // Hide ghost lobbies (assume anything older than 16 hours)
      return game.created_at > Date.now() - 57600000;
    });

  // Calculate statistics
  const totalGameCount = games.length;
  const publicGames = games.filter(game => game.is_public);
  const privateGames = games.filter(game => !game.is_public);
  const inProgressGames = games.filter(game => game.status != "Joinable");
  const masterProxyGames = games.filter(game => game.mode == "Master Server Proxy");

  const totalPlayerCount = games.reduce((sum, game) => sum + (game.player_count || 0), 0);
  const publicPlayerCount = publicGames.reduce((sum, game) => sum + (game.player_count || 0), 0);
  const privatePlayerCount = privateGames.reduce((sum, game) => sum + (game.player_count || 0), 0);

  const stats = {
    total_game_count: totalGameCount,
    private_game_count: privateGames.length,
    public_game_count: publicGames.length,
    in_progress_count: inProgressGames.length,
    master_proxy_count: masterProxyGames.length,
    total_player_count: totalPlayerCount,
    private_player_count: privatePlayerCount,
    public_player_count: publicPlayerCount
  };

  return res.send(stats);
});

router.get("/public_games", async (req, res, _next) => {
  let gameFilter = "";

  if (req.query.titleid != null && (req.query.titleid as string)?.length > 0) {
    gameFilter = req.query.titleid as string;
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  const results = await redisClient.json.get("games");

  if (results == null || typeof results != "object") {
    return res.sendStatus(404);
  }

  const games = Object.entries(results)
    .map(([_, game]) => {
      const modifiedGame = { ...game };
      
      const gameListEntry = gamelist.find(
        g => g.id.toLowerCase() === `0x${game.title_id.toLowerCase()}`
      );

      if (gameListEntry) {
        modifiedGame.game_name = gameListEntry.name;
      } else {
        const customName = titleIdManager.getTitleName(game.title_id);
        if (customName) {
          modifiedGame.game_name = customName;
        } else {
          titleIdManager.addUnknownTitleId(game.title_id);
          modifiedGame.game_name = "Unknown";
        }
      }

      return modifiedGame;
    })
    .filter(game => {
      // Hide ghost lobbies (assume anything older than 16 hours)
      return game.created_at > Date.now() - 57600000;
    });

  if (gameFilter.length > 0) {
    return res.send(games.filter((game) => game.title_id === gameFilter));
  }

  return res.send(games);
});

export default router;
