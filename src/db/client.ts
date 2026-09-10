import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import * as schema from './schema';

export const DATABASE_NAME = 'pilltime.db';

/** Instancia de Drizzle sobre la conexión SQLite del contexto de React (ver app/_layout.tsx -> SQLiteProvider). */
export function useDb() {
  const sqlite = useSQLiteContext();
  return useMemo(() => drizzle(sqlite, { schema }), [sqlite]);
}

export type Db = ReturnType<typeof useDb>;
