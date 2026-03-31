import type { PaginationResult } from '@/services/types/pagination'

import { del, get, post, put } from '@/services/request'

export interface TaskResultParams {
  name?: string
  task_id?: string
  page?: number
  size?: number
}

export interface TaskSchedulerParams {
  name?: string
  type?: number
  page?: number
  size?: number
}

export interface TaskResult {
  id: number
  task_id: string
  status: string
  result?: string
  date_done?: string
  traceback?: string
  name?: string
  args?: string
  kwargs?: string
  worker?: string
  retries?: number
  queue?: string
}

export interface CreateTaskSchedulerParams {
  name: string
  task: string
  args?: string
  kwargs?: string
  queue?: string
  exchange?: string
  routing_key?: string
  start_time?: string
  expire_time?: string
  expire_seconds?: number
  type: number
  interval_every?: number
  interval_period?: string
  crontab: string
  one_off: boolean
  remark?: string
}

export interface TaskSchedulerResult extends CreateTaskSchedulerParams {
  id: number
  enabled: boolean
  total_run_count: number
  last_run_time: string
  created_time: string
  updated_time?: string
}

export function getTaskResultApi(pk: number) {
  return get<TaskResult>(`/v1/task-results/${pk}`)
}

export function getTaskResultListApi(params?: TaskResultParams) {
  return get<PaginationResult<TaskSchedulerResult>>('/v1/task-results', { params: params ?? {} })
}

export function deleteTaskResultApi(pks: number[]) {
  return del('/v1/task-results', { data: { pks } })
}

export function getAllTaskSchedulerApi() {
  return get<TaskSchedulerResult[]>('/v1/schedulers/all')
}

export function getTaskSchedulerListApi(params?: TaskSchedulerParams) {
  return get<PaginationResult<TaskSchedulerResult>>('/v1/schedulers', { params: params ?? {} })
}

export function getTaskSchedulerApi(pk: number) {
  return get<TaskSchedulerResult>(`/v1/schedulers/${pk}`)
}

export function createTaskSchedulerApi(data: CreateTaskSchedulerParams) {
  return post('/v1/schedulers', data)
}

export function updateTaskSchedulerApi(pk: number, data: CreateTaskSchedulerParams) {
  return put(`/v1/schedulers/${pk}`, data)
}

export function updateTaskSchedulerStatusApi(pk: number) {
  return put(`/v1/schedulers/${pk}/status`)
}

export function deleteTaskSchedulerApi(pk: number) {
  return del(`/v1/schedulers/${pk}`)
}

export function executeTaskSchedulerApi(pk: number) {
  return post(`/v1/schedulers/${pk}/execute`)
}

export function getTaskRegisteredApi() {
  return get<unknown[]>('/v1/tasks/registered')
}

export function revokeTaskSchedulerApi(task_id: string) {
  return del(`/v1/tasks/${task_id}/cancel`)
}
