import type { ModerationStatus } from '../types'

export function assertEditable(currentStatus: ModerationStatus, actingAsModerator: boolean): void {
  if (!actingAsModerator && currentStatus === 'removed') {
    throw new Error('This item has been removed and cannot be edited until a moderator restores it.')
  }
}

export function nextEditStatus(currentStatus: ModerationStatus, actingAsModerator: boolean): ModerationStatus {
  return actingAsModerator ? currentStatus : 'pending_review'
}
