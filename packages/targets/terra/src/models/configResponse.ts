export interface ConfigResponse {
  link: string
  validator: string
  payment_amount: BigInt
  max_submission_count: number
  min_submission_count: number
  restart_delay: number
  timeout: number
  decimals: number
  description: string
  min_submission_value: BigInt
  max_submission_value: BigInt
}
