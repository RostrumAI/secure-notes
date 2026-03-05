import { SessionRepository } from '../db/repository';
import { getAutolockMinutes } from '../config/config';

export function checkAutoLock(sessionRepo: SessionRepository): boolean {
  const session = sessionRepo.getSession();
  if (!session || !session.unlocked_at || !session.last_activity) {
    return false;
  }

  const autolockMinutes = getAutolockMinutes();
  if (autolockMinutes === null) {
    return true;
  }

  const now = Date.now();
  const elapsed = (now - session.last_activity) / 1000 / 60;

  if (elapsed >= autolockMinutes) {
    sessionRepo.lock();
    return false;
  }

  return true;
}

export function isUnlocked(sessionRepo: SessionRepository): boolean {
  if (!sessionRepo.isUnlocked()) {
    return false;
  }

  return checkAutoLock(sessionRepo);
}

export function updateActivity(sessionRepo: SessionRepository): void {
  sessionRepo.updateActivity();
}
