import * as SQLite from 'expo-sqlite';

export type MatchSnapshotInput = {
  lifeOne: number;
  lifeTwo: number;
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
};

export type SavedMatchSnapshot = MatchSnapshotInput & { id: number };

export type MatchDetails = MatchSummary & { snapshots: SavedMatchSnapshot[] };

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
};

type SnapshotRow = {
  id: number;
  life_one: number;
  life_two: number;
  recorded_at: string;
  event: MatchSnapshotInput['event'];
  is_final: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
            player_two_color TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS match_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            life_one INTEGER NOT NULL,
            life_two INTEGER NOT NULL,
            recorded_at TEXT NOT NULL,
            event TEXT NOT NULL DEFAULT 'life_change',
            is_final INTEGER NOT NULL DEFAULT 0
          );
        `);
        const snapshotColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(match_snapshots)');
        if (!snapshotColumns.some((column) => column.name === 'event')) {
          await database.execAsync("ALTER TABLE match_snapshots ADD COLUMN event TEXT NOT NULL DEFAULT 'life_change'");
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

function toSummary(row: MatchRow): MatchSummary {
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
}) {
  const database = await getDatabase();
  let matchId = 0;

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      'INSERT INTO matches (name, started_at, finished_at, final_life_one, final_life_two, player_one_color, player_two_color) VALUES (?, ?, ?, ?, ?, ?, ?)',
      input.name,
      input.startedAt,
      input.finishedAt,
      input.finalLifeOne,
      input.finalLifeTwo,
      input.playerOneColor,
      input.playerTwoColor,
    );
    matchId = result.lastInsertRowId;

    for (const snapshot of input.snapshots) {
      await database.runAsync(
        'INSERT INTO match_snapshots (match_id, life_one, life_two, recorded_at, event, is_final) VALUES (?, ?, ?, ?, ?, ?)',
        matchId,
        snapshot.lifeOne,
        snapshot.lifeTwo,
        snapshot.recordedAt,
        snapshot.event,
        snapshot.isFinal ? 1 : 0,
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
    'SELECT id, life_one, life_two, recorded_at, event, is_final FROM match_snapshots WHERE match_id = ? ORDER BY recorded_at ASC, id ASC',
    id,
  );

  return {
    ...toSummary(row),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      lifeOne: snapshot.life_one,
      lifeTwo: snapshot.life_two,
      recordedAt: snapshot.recorded_at,
      event: snapshot.event,
      isFinal: snapshot.is_final === 1,
    })),
  };
}
