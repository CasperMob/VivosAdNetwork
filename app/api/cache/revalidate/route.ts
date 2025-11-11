import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const tag = searchParams.get('tag')
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret')

    // Optional: Add a secret key for security
    const expectedSecret = process.env.REVALIDATE_SECRET
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid revalidation secret' },
        { status: 401 }
      )
    }

    // Revalidate specific path
    if (path) {
      revalidatePath(path)
      return NextResponse.json({
        revalidated: true,
        path: path,
        now: Date.now(),
      })
    }

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag)
      return NextResponse.json({
        revalidated: true,
        tag: tag,
        now: Date.now(),
      })
    }

    // Revalidate common paths
    revalidatePath('/api/ads')
    revalidatePath('/api/ads/all')
    revalidatePath('/api/campaigns')

    return NextResponse.json({
      revalidated: true,
      paths: ['/api/ads', '/api/ads/all', '/api/campaigns'],
      now: Date.now(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error revalidating cache' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for convenience, but POST is recommended
  return POST(request)
}

