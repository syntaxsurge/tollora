import {
  BarChart3,
  BookOpenCheck,
  Megaphone,
  MonitorCheck,
  Video
} from 'lucide-react'

export type AgentTemplate = {
  id: string
  title: string
  category: string
  summary: string
  objective: string
  sourceText: string
  recommendedBudgetMusd: number
  maxPaidActions: number
  toolStrategy: string
  deliverables: string[]
  icon: typeof Megaphone
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'launch-pack',
    title: 'Launch Pack Agent',
    category: 'Go-to-market',
    summary:
      'Researches developer signals, writes launch copy, and prepares an auditable proof package.',
    objective: 'Create a launch pack for my MUSD-native paid API product.',
    sourceText:
      'The product sells premium API responses to AI agents and records MUSD receipts on Mezo.',
    recommendedBudgetMusd: 0.9,
    maxPaidActions: 4,
    toolStrategy:
      'Start with public developer data tools, then add media only when the goal asks for creative collateral.',
    deliverables: ['Positioning brief', 'Developer copy', 'Market signal'],
    icon: Megaphone
  },
  {
    id: 'market-radar',
    title: 'Market Radar Agent',
    category: 'Research',
    summary:
      'Scans public discussion and repository activity to summarize demand, competitors, and launch angles.',
    objective:
      'Research the market for an API product and summarize developer demand, competitors, and launch channels.',
    sourceText:
      'Focus on current developer conversations, public repositories, and useful positioning signals.',
    recommendedBudgetMusd: 0.35,
    maxPaidActions: 3,
    toolStrategy:
      'Prioritize low-cost public data tools and skip expensive media generation.',
    deliverables: ['Demand summary', 'Competitor map', 'Launch keywords'],
    icon: BarChart3
  },
  {
    id: 'docs-brief',
    title: 'Documentation Brief Agent',
    category: 'Developer experience',
    summary:
      'Turns product context and research into quickstart copy, integration steps, and FAQ content.',
    objective:
      'Create a developer documentation brief for my API, including quickstart steps, integration guidance, and FAQ copy.',
    sourceText:
      'The target reader is a developer integrating a paid API into a backend, CLI, or autonomous agent.',
    recommendedBudgetMusd: 0.4,
    maxPaidActions: 3,
    toolStrategy:
      'Use public context and repository signals to keep the documentation grounded in real developer expectations.',
    deliverables: ['Quickstart outline', 'Integration notes', 'FAQ copy'],
    icon: BookOpenCheck
  },
  {
    id: 'api-readiness',
    title: 'API Readiness Agent',
    category: 'Operations',
    summary:
      'Checks whether a listed API is positioned, priced, documented, and safe for agent usage.',
    objective:
      'Review my paid API listing for launch readiness and produce a prioritized fix list for pricing, docs, reliability, and agent compatibility.',
    sourceText:
      'Evaluate the API as if external developers and autonomous agents will buy it from the marketplace.',
    recommendedBudgetMusd: 0.3,
    maxPaidActions: 3,
    toolStrategy:
      'Use developer and public data tools to compare expected marketplace ergonomics before recommending fixes.',
    deliverables: ['Readiness score', 'Risk list', 'Fix plan'],
    icon: MonitorCheck
  },
  {
    id: 'video-promo',
    title: 'Video Promo Agent',
    category: 'Creative',
    summary:
      'Plans a short promotional concept and may use async media tools when budget allows.',
    objective:
      'Create a short promotional video concept and supporting launch copy for my API product.',
    sourceText:
      'The video should explain the product in a concise developer-friendly style and produce a shareable project handoff when media tools are available.',
    recommendedBudgetMusd: 1.2,
    maxPaidActions: 4,
    toolStrategy:
      'Use research tools first, then use media generation only if the remaining budget can cover the quote.',
    deliverables: ['Video concept', 'Project handoff', 'Social copy'],
    icon: Video
  }
]

export function getAgentTemplate(templateId: string | null | undefined) {
  return agentTemplates.find(template => template.id === templateId)
}
