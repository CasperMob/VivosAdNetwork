import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'VivosAdNetwork',
  },
})

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Use OpenRouter to analyze the website and extract information
    const systemPrompt = `You are an assistant that analyzes websites and extracts information for ad campaigns.
    Given a website URL, analyze the website content and extract:
    - title: A compelling campaign title (max 60 characters)
    - message: A short, engaging ad message (max 150 characters)
    - keywords: An array of 5-10 relevant keywords for contextual advertising
    - target_url: The website URL provided
    - image_url: A URL to the website's logo or main image (try common paths like /logo.png, /logo.svg, /favicon.ico, or og:image meta tag). If you can't find one, return null.
    
    Return ONLY a valid JSON object with this structure:
    {
      "title": "string",
      "message": "string",
      "keywords": ["keyword1", "keyword2", ...],
      "target_url": "string",
      "image_url": "string or null"
    }`

    // Try to find logo URL by checking common paths
    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`
    const commonLogoPaths = [
      '/logo.png',
      '/logo.svg',
      '/logo.jpg',
      '/logo.jpeg',
      '/favicon.ico',
      '/favicon.png',
      '/images/logo.png',
      '/images/logo.svg',
      '/assets/logo.png',
      '/assets/logo.svg',
    ]

    // Try to fetch the HTML to find og:image or logo
    let foundLogoUrl: string | null = null
    try {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      const html = await htmlResponse.text()
      
      // Try to find og:image
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
      if (ogImageMatch && ogImageMatch[1]) {
        foundLogoUrl = ogImageMatch[1].startsWith('http') 
          ? ogImageMatch[1] 
          : new URL(ogImageMatch[1], baseUrl).toString()
      } else {
        // Try to find logo in common paths
        for (const path of commonLogoPaths) {
          const logoUrl = new URL(path, baseUrl).toString()
          try {
            const logoResponse = await fetch(logoUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
            if (logoResponse.ok) {
              foundLogoUrl = logoUrl
              break
            }
          } catch {
            // Continue to next path
          }
        }
      }
    } catch (error) {
      // If we can't fetch HTML, we'll rely on OpenRouter to suggest a logo URL
      console.log('Could not fetch HTML for logo detection:', error)
    }

    // Fetch website content (simplified - in production you might want to use a web scraping service)
    // For now, we'll ask OpenRouter to analyze based on the URL
    const userPrompt = `Analyze this website URL and extract ad campaign information: ${url}
    
    Please provide:
    1. A compelling campaign title
    2. A short, engaging ad message that would attract clicks
    3. 5-10 relevant keywords for contextual advertising
    4. The target URL
    5. A URL to the website's logo or main image. Try common paths like /logo.png, /logo.svg, /favicon.ico, or look for og:image meta tag. If found, use: ${foundLogoUrl || 'null'}
    
    Return the information as a JSON object.`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content || ''
    
    try {
      const extractedData = JSON.parse(response)
      
      // Validate the extracted data
      if (!extractedData.title || !extractedData.message || !extractedData.keywords) {
        return NextResponse.json(
          { error: 'Failed to extract required information from website' },
          { status: 500 }
        )
      }

      // Use found logo URL if OpenRouter didn't provide one or if OpenRouter's is null
      const imageUrl = extractedData.image_url || foundLogoUrl || null

      return NextResponse.json({
        success: true,
        data: {
          title: extractedData.title,
          message: extractedData.message,
          keywords: Array.isArray(extractedData.keywords) 
            ? extractedData.keywords 
            : extractedData.keywords.split(',').map((k: string) => k.trim()),
          target_url: url,
          image_url: imageUrl,
        },
      })
    } catch (parseError) {
      console.error('Failed to parse OpenRouter response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse extracted information' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error extracting website information:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract website information' },
      { status: 500 }
    )
  }
}


