import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Equivalent to lodash.get
export function getPath(obj: any, path?: string, defaultValue?: any) {
  if (!path) return obj

  const keys = path.split('.')
  let result = obj
  for (const key of keys) {
    if (result === null || result === undefined) return defaultValue
    result = result[key]
  }
  return result
}

// Equivalent to lodash.set
export function setPath(obj: any, path: string | null, value: any) {
  if (!path) {
    // If path is not specified, set the entire object
    Object.assign(obj, value)
    return obj
  }

  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (current[key] === undefined) {
      current[key] = {}
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
  return obj
}
