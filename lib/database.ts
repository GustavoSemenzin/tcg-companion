import * as SQLite from 'expo-sqlite';

export type MatchSnapshotInput = {
  lifeOne: number;
  lifeTwo: number;
  lifeThree?: number;
  lifeFour?: number;
  lives?: number[];
  recordedAt: string;
  event: 'start' | 'life_change' | 'restart' | 'finish';
  isFinal?: boolean;
};

export type MatchSummary = {
  id: number;
  name: string;
  startedAt: string;
  finishedAt: string;
  finalLifeOne: number;
  finalLifeTwo: number;
  playerOneColor: string;
  playerTwoColor: string;
  snapshotCount: number;
  playerCount: number;
  startingLife: number;
  finalLives: number[];
  playerColors: string[];
  playerNames: string[];
  winnerPlayer: number | null;
  md3Score: [number, number] | null;
};

export type SavedMatchSnapshot = MatchSnapshotInput & { id: number };

export type MatchDetails = MatchSummary & { snapshots: SavedMatchSnapshot[] };

export type CurrentMatchCache = {
  hasStarted: boolean;
  startedAt: string;
  lifeOne: number;
  lifeTwo: number;
  playerOneColor: string;
  playerTwoColor: string;
  history: Array<{
    id: string;
    lifeOne: number;
    lifeTwo: number;
    lifeThree?: number;
    lifeFour?: number;
    lives?: number[];
    createdAt: string;
    event: MatchSnapshotInput['event'];
  }>;
  pendingSnapshotEvent: 'life_change' | 'restart';
  hasPendingSnapshot: boolean;
  updatedAt: string;
  playerCount?: number;
  startingLife?: number;
  lives?: number[];
  playerColors?: string[];
  playerNames?: string[];
};

type MatchRow = {
  id: number;
  name: string;
  started_at: string;
  finished_at: string;
  final_life_one: number;
  final_life_two: number;
  player_one_color: string;
  player_two_color: string;
  snapshot_count: number;
  player_count: number;
  starting_life: number;
  final_life_three: number;
  final_life_four: number;
  player_three_color: string;
  player_four_color: string;
  player_names: string;
  winner_player: number | null;
  md3_player_one_wins: number | null;
  md3_player_two_wins: number | null;
};

type SnapshotRow = {
  id: number;
  life_one: number;
  life_two: number;
  recorded_at: string;
  event: MatchSnapshotInput['event'];
  is_final: number;
  life_three: number;
  life_four: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let currentMatchWriteQueue: Promise<void> = Promise.resolve();

function enqueueCurrentMatchWrite(operation: () => Promise<void>) {
  const pendingWrite = currentMatchWriteQueue.then(operation);
  currentMatchWriteQueue = pendingWrite.catch(() => {});
  return pendingWrite;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('tcg-companion.db')
      .then(async (database) => {
        await database.execAsync(`
          PRAGMA foreign_keys = ON;
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT NOT NULL,
            final_life_one INTEGER NOT NULL,
            final_life_two INTEGER NOT NULL,
            player_one_color TEXT NOT NULL,
            player_two_color TEXT NOT NULL,
            player_count INTEGER NOT NULL DEFAULT 2,
            starting_life INTEGER NOT NULL DEFAULT 20,
            final_life_three INTEGER NOT NULL DEFAULT 0,
            final_life_four INTEGER NOT NULL DEFAULT 0,
            player_three_color TEXT NOT NULL DEFAULT '#159447',
            player_four_color TEXT NOT NULL DEFAULT '#853CC6',
            player_names TEXT NOT NULL DEFAULT '[]',
            winner_player INTEGER,
            md3_player_one_wins INTEGER,
            md3_player_two_wins INTEGER
          );
          CREATE TABLE IF NOT EXISTS match_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            life_one INTEGER NOT NULL,
            life_two INTEGER NOT NULL,
            recorded_at TEXT NOT NULL,
            event TEXT NOT NULL DEFAULT 'life_change',
            is_final INTEGER NOT NULL DEFAULT 0,
            life_three INTEGER NOT NULL DEFAULT 0,
            life_four INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS current_match (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL
          );
        `);
        const snapshotColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(match_snapshots)');
        const matchColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(matches)');
        const matchMigrations = [
          ['player_count', 'INTEGER NOT NULL DEFAULT 2'],
          ['starting_life', 'INTEGER NOT NULL DEFAULT 20'],
          ['final_life_three', 'INTEGER NOT NULL DEFAULT 0'],
          ['final_life_four', 'INTEGER NOT NULL DEFAULT 0'],
          ['player_three_color', "TEXT NOT NULL DEFAULT '#159447'"],
          ['player_four_color', "TEXT NOT NULL DEFAULT '#853CC6'"],
          ['player_names', "TEXT NOT NULL DEFAULT '[]'"],
          ['winner_player', 'INTEGER'],
          ['md3_player_one_wins', 'INTEGER'],
          ['md3_player_two_wins', 'INTEGER'],
        ] as const;
        for (const [column, definition] of matchMigrations) {
          if (!matchColumns.some((item) => item.name === column)) {
            await database.execAsync(`ALTER TABLE matches ADD COLUMN ${column} ${definition}`);
          }
        }
        if (!snapshotColumns.some((column) => column.name === 'event')) {
          await database.execAsync("ALTER TABLE match_snapshots ADD COLUMN event TEXT NOT NULL DEFAULT 'life_change'");
        }
        if (!snapshotColumns.some((column) => column.name === 'life_three')) {
          await database.execAsync('ALTER TABLE match_snapshots ADD COLUMN life_three INTEGER NOT NULL DEFAULT 0');
        }
        if (!snapshotColumns.some((column) => column.name === 'life_four')) {
          await database.execAsync('ALTER TABLE match_snapshots ADD COLUMN life_four INTEGER NOT NULL DEFAULT 0');
        }
        return database;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export async function getCurrentMatch(): Promise<CurrentMatchCache | null> {
  await currentMatchWriteQueue;
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ data: string }>('SELECT data FROM current_match WHERE id = 1');
  if (!row) return null;

  try {
    return JSON.parse(row.data) as CurrentMatchCache;
  } catch {
    return null;
  }
}

export async function saveCurrentMatch(cache: CurrentMatchCache) {
  return enqueueCurrentMatchWrite(async () => {
    const database = await getDatabase();
    await database.runAsync(
      'INSERT INTO current_match (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
      JSON.stringify(cache),
    );
  });
}

export async function clearCurrentMatch() {
  return enqueueCurrentMatchWrite(async () => {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM current_match WHERE id = 1');
  });
}

function toSummary(row: MatchRow): MatchSummary {
  let savedPlayerNames: string[] = [];
  try {
    savedPlayerNames = JSON.parse(row.player_names || '[]') as string[];
  } catch {
    savedPlayerNames = [];
  }
  return {
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    finalLifeOne: row.final_life_one,
    finalLifeTwo: row.final_life_two,
    playerOneColor: row.player_one_color,
    playerTwoColor: row.player_two_color,
    snapshotCount: row.snapshot_count,
    playerCount: row.player_count,
    startingLife: row.starting_life,
    finalLives: [row.final_life_one, row.final_life_two, row.final_life_three, row.final_life_four].slice(0, row.player_count),
    playerColors: [row.player_one_color, row.player_two_color, row.player_three_color, row.player_four_color].slice(0, row.player_count),
    playerNames: Array.from({ length: row.player_count }, (_, index) => savedPlayerNames[index]?.trim() || `Jogador ${index + 1}`),
    winnerPlayer: row.winner_player,
    md3Score: row.md3_player_one_wins === null || row.md3_player_two_wins === null
      ? null
      : [row.md3_player_one_wins, row.md3_player_two_wins],
  };
}

export async function saveMatch(input: {
  name: string;
  startedAt: string;
  finishedAt: string;
  finalLifeOne: number;
  finalLifeTwo: number;
  playerOneColor: string;
  playerTwoColor: string;
  snapshots: MatchSnapshotInput[];
  playerCount: number;
  startingLife: number;
  finalLives: number[];
  playerColors: string[];
  playerNames: string[];
  winnerPlayer: number | null;
  md3Score: [number, number] | null;
}) {
  const database = await getDatabase();
  let matchId = 0;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      'INSERT INTO matches (name, started_at, finished_at, final_life_one, final_life_two, player_one_color, player_two_color, player_count, starting_life, final_life_three, final_life_four, player_three_color, player_four_color, player_names, winner_player, md3_player_one_wins, md3_player_two_wins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      input.name,
      input.startedAt,
      input.finishedAt,
      input.finalLifeOne,
      input.finalLifeTwo,
      input.playerOneColor,
      input.playerTwoColor,
      input.playerCount,
      input.startingLife,
      input.finalLives[2] ?? 0,
      input.finalLives[3] ?? 0,
      input.playerColors[2] ?? '#159447',
      input.playerColors[3] ?? '#853CC6',
      JSON.stringify(input.playerNames),
      input.winnerPlayer,
      input.md3Score?.[0] ?? null,
      input.md3Score?.[1] ?? null,
    );
    matchId = result.lastInsertRowId;

    for (const snapshot of input.snapshots) {
      await database.runAsync(
        'INSERT INTO match_snapshots (match_id, life_one, life_two, recorded_at, event, is_final, life_three, life_four) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        matchId,
        snapshot.lifeOne,
        snapshot.lifeTwo,
        snapshot.recordedAt,
        snapshot.event,
        snapshot.isFinal ? 1 : 0,
        snapshot.lives?.[2] ?? snapshot.lifeThree ?? 0,
        snapshot.lives?.[3] ?? snapshot.lifeFour ?? 0,
      );
    }
  });

  return matchId;
}

export async function getMatches() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<MatchRow>(`
    SELECT matches.*, COUNT(match_snapshots.id) AS snapshot_count
    FROM matches
    LEFT JOIN match_snapshots ON match_snapshots.match_id = matches.id
    GROUP BY matches.id
    ORDER BY matches.finished_at DESC
  `);
  return rows.map(toSummary);
}

export async function clearMatches() {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM match_snapshots');
    await database.runAsync('DELETE FROM matches');
  });
}

export async function getMatch(id: number): Promise<MatchDetails | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<MatchRow>(`
    SELECT matches.*, COUNT(match_snapshots.id) AS snapshot_count
    FROM matches
    LEFT JOIN match_snapshots ON match_snapshots.match_id = matches.id
    WHERE matches.id = ?
    GROUP BY matches.id
  `, id);

  if (!row) return null;

  const snapshots = await database.getAllAsync<SnapshotRow>(
    'SELECT id, life_one, life_two, life_three, life_four, recorded_at, event, is_final FROM match_snapshots WHERE match_id = ? ORDER BY recorded_at ASC, id ASC',
    id,
  );

  return {
    ...toSummary(row),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      lifeOne: snapshot.life_one,
      lifeTwo: snapshot.life_two,
      lifeThree: snapshot.life_three,
      lifeFour: snapshot.life_four,
      lives: [snapshot.life_one, snapshot.life_two, snapshot.life_three, snapshot.life_four].slice(0, row.player_count),
      recordedAt: snapshot.recorded_at,
      event: snapshot.event,
      isFinal: snapshot.is_final === 1,
    })),
  };
}
