export interface StrategySummary {
  id: string
  name: string
  status: 'draft' | 'running' | 'paused' | 'stopped'
  returnRate: number
  maxDrawdown: number
  updatedAt: string
}
