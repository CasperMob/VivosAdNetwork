/**
 * Chatbot Integration Example
 * 
 * This example shows how to integrate VivosAdNetwork ads into a chatbot
 */

import React, { useState } from 'react'
import { ChatbotAd, useChatbotAd } from '@vivosadnetwork/sdk'

// Example 1: Using the ChatbotAd component
function ChatbotWithAdComponent() {
  const [userMessage, setUserMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])

  const handleSend = () => {
    // Add user message
    setMessages([...messages, { role: 'user', content: userMessage }])

    // Extract keyword from user message (simple example)
    const keyword = extractKeyword(userMessage)

    // Add bot response with ad
    setMessages([
      ...messages,
      { role: 'user', content: userMessage },
      {
        role: 'assistant',
        content: 'Here\'s some information about that:',
        // Ad will be rendered here
      },
    ])

    setUserMessage('')
  }

  return (
    <div className="chatbot">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
            {/* Render ad after assistant messages */}
            {msg.role === 'assistant' && (
              <ChatbotAd
                keyword={extractKeyword(messages[idx - 1]?.content || '')}
                publisherId="your-publisher-id"
              />
            )}
          </div>
        ))}
      </div>
      <input
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
    </div>
  )
}

// Example 2: Using the useChatbotAd hook for text formatting
function ChatbotWithAdHook() {
  const [userMessage, setUserMessage] = useState('')
  const keyword = extractKeyword(userMessage)
  const { ad, adAsText, adAsMarkdown } = useChatbotAd(keyword, 'your-publisher-id')

  const formatResponse = (userMsg: string): string => {
    let response = `I understand you're asking about "${keyword}". Here's what I found:\n\n`
    
    // Append ad as text if available
    if (adAsText) {
      response += `\n--- Advertisement ---\n${adAsText}\n---\n`
    }

    return response
  }

  return (
    <div className="chatbot">
      <input
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
      />
      {userMessage && (
        <div className="response">
          {formatResponse(userMessage)}
        </div>
      )}
    </div>
  )
}

// Example 3: Custom rendering for chatbot
function ChatbotWithCustomAd() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])

  return (
    <div className="chatbot">
      {messages.map((msg, idx) => (
        <div key={idx} className={`message ${msg.role}`}>
          {msg.content}
          {msg.role === 'assistant' && (
            <ChatbotAd
              keyword={extractKeyword(messages[idx - 1]?.content || '')}
              publisherId="your-publisher-id"
              renderAd={(ad, onClick) => (
                <div className="chatbot-ad" style={{ 
                  padding: '8px',
                  margin: '8px 0',
                  borderLeft: '3px solid #007AFF',
                  backgroundColor: '#f0f0f0'
                }}>
                  <strong>💡 {ad.title}</strong>
                  <br />
                  <span>{ad.message}</span>
                  <br />
                  <a href={ad.target_url} onClick={onClick} style={{ color: '#007AFF' }}>
                    Learn more →
                  </a>
                </div>
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Helper function to extract keyword from user message
function extractKeyword(message: string): string {
  // Simple keyword extraction - in production, use NLP or keyword matching
  const words = message.toLowerCase().split(/\s+/)
  const commonWords = ['the', 'a', 'an', 'is', 'are', 'what', 'how', 'where', 'when', 'why']
  const keywords = words.filter(word => word.length > 3 && !commonWords.includes(word))
  return keywords[0] || 'general'
}

export { ChatbotWithAdComponent, ChatbotWithAdHook, ChatbotWithCustomAd }

