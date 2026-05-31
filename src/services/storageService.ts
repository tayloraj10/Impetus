import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function deleteImage(url: string): Promise<void> {
  const storageRef = ref(storage, url)
  await deleteObject(storageRef)
}

export function topicImagePath(topicSlug: string, file: File): string {
  const ext = file.name.split('.').pop()
  return `topics/${topicSlug}/cover.${ext}`
}

export function groupLogoPath(file: File): string {
  const ext = file.name.split('.').pop()
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `groups/logos/${uid}.${ext}`
}

export function submissionImagePath(challengeId: string, userId: string, file: File): string {
  const ext = file.name.split('.').pop()
  return `challenge_submissions/${challengeId}/${userId}-${Date.now()}.${ext}`
}
