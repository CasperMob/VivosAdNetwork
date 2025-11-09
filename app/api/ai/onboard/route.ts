import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an assistant that helps advertisers create contextual ad campaigns for a chatbot ad network.
From this conversation, extract structured data in JSON:
{title, message, image_idea, keywords[], cpc_bid, budget_total, target_url}.
Respond naturally and guide the user conversationally.
When you have collected all the necessary information, provide a JSON object with the campaign details.`

export async function POST(request: NextRequest) {
  try {
    const { messages, stream = false } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const conversationMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages,
    ]

    if (stream) {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        stream: true,
        temperature: 0.7,
      })

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      })

      const response = completion.choices[0]?.message?.content || ''
      
      // Try to parse JSON from the response
      let parsedResponse
      try {
        parsedResponse = JSON.parse(response)
      } catch {
        // If not JSON, return as text
        return NextResponse.json({ content: response })
      }

      return NextResponse.json(parsedResponse)
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}



