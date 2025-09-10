import { use } from 'react'
import { MainContent } from '@/components/layout/MainContent'

type Props = { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export default function StoryPage({ params, searchParams }: Props) {
  const { id } = use(params)
  const { page } = use(searchParams)
  
  // Check if this looks like a share token (shorter alphanumeric string) vs story ID
  // Share tokens are 12 chars, Convex IDs are longer and start with specific patterns
  const isShareToken = id.length === 12 && /^[A-Za-z0-9]+$/.test(id)
  
  return (
    <MainContent 
      storyId={id} 
      isPublicView={isShareToken}
      shareToken={isShareToken ? id : undefined}
      requestedPage={page ? parseInt(page, 10) : undefined}
    />
  )
}