import type { TransactionSql } from 'postgres'
import type { Caller } from './session'

/** One audit_log row per write: who, what, before and after. Pass the transaction so the log commits or rolls back with the change. */
export async function audit(tx: TransactionSql, who: Caller, action: string, table: string, rowId: string, before: unknown, after: unknown) {
  await tx`
    insert into audit_log (actor, actor_email, action, table_name, row_id, before, after)
    values (${who.id}, ${who.email}, ${action}, ${table}, ${rowId},
            ${before === null || before === undefined ? null : tx.json(before as never)},
            ${after === null || after === undefined ? null : tx.json(after as never)})`
}
