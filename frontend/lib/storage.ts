// Only type definitions for backend API models

export interface User {
  id: string
  name: string
  email: string
}

export interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
}

export interface VoteOption {
  id: string
  text: string
  votes: string[] // user IDs who voted for this
}

export interface Poll {
  id: string
  title: string
  options: VoteOption[]
  createdBy: string
  createdAt: number
  completed: boolean
}

export interface Room {
  id: string
  name: string
  code: string
  description?: string
  createdBy: string
  createdAt: number
  members: string[] // user IDs
  messages: Message[]
  polls: Poll[]
}
