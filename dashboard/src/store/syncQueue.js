import { db } from '../db';
import api from '../api/client';

// Add a mutation to the offline queue
export async function enqueue(entity, operation, payload) {
  await db.sync_queue.add({
    entity,
    operation, // 'POST' | 'PATCH' | 'DELETE'
    payload,
    status: 'pending',
    created_at: Date.now(),
  });
}

// How many mutations are waiting to sync
export async function getPendingCount() {
  return db.sync_queue.where('status').equals('pending').count();
}

// Process all pending mutations in creation order
export async function flushQueue() {
  const pending = await db.sync_queue
    .where('status')
    .equals('pending')
    .sortBy('created_at');

  let synced = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      await dispatch(item);
      await db.sync_queue.update(item.id, {
        status: 'synced',
        synced_at: Date.now(),
      });
      synced++;
    } catch (e) {
      await db.sync_queue.update(item.id, {
        status: 'error',
        error: e.message,
      });
      errors++;
    }
  }

  // Prune synced entries older than 1 hour
  const cutoff = Date.now() - 3_600_000;
  await db.sync_queue
    .where('status')
    .equals('synced')
    .and((r) => r.synced_at < cutoff)
    .delete();

  return { synced, errors };
}

async function dispatch({ entity, operation, payload }) {
  switch (`${entity}:${operation}`) {
    case 'menu:POST':
      return api.post('/menu', payload);
    case 'menu:PATCH':
      return api.patch(`/menu/${payload.id}`, payload);
    case 'menu:DELETE':
      return api.delete(`/menu/${payload.id}`);
    case 'tables:PATCH':
      return api.patch(`/tables/${payload.id}/status`, { status: payload.status });
    case 'orders:PATCH':
      return api.patch(`/orders/${payload.id}/status`, { status: payload.status });
    default:
      throw new Error(`Unhandled sync operation: ${entity}:${operation}`);
  }
}