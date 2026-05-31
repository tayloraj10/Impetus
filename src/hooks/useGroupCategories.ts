import { useEffect, useState } from 'react'
import { subscribeCategories } from '../services/categoriesService'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeCategories((cats) => {
      setCategories(cats)
      setLoading(false)
    })
    return unsub
  }, [])

  return { categories, loading }
}
