import { requestClient } from '@/services/request'

// ==================== 类型定义 ====================

export interface ContainerListResponse {
  id: string
  name: string
  image: string
  status: string
  created: null | string
  ports: string[]
  stack: null | string
  ip_address: null | string
  ownership: null | string
}

export interface ContainerDetailResponse {
  id: string
  name: string
  image: string
  status: string
  created: null | string
  ports: Record<string, any>
  env: string[]
  command: null | string[]
  working_dir: null | string
  ip_address: null | string
  started_at: null | string
  running_for: null | string
  entrypoint: null | string[]
  labels: Record<string, string>
  restart_policy: string
  port_configuration: string[]
  volumes: Array<{ container_path: string, host_volume: string }>
  networks: Array<{
    gateway: string
    ip_address: string
    mac_address: string
    network: string
  }>
}

export interface CreateContainerParam {
  image: string
  name?: string
  command?: string[]
  entrypoint?: string[]
  working_dir?: string
  user?: string
  env?: Record<string, string>
  ports?: Record<string, [number, number]>
  publish_all_ports?: boolean
  volumes?: Record<string, Record<string, string>>
  networks?: string[]
  restart_policy?: string
  labels?: Record<string, string>
  tty?: boolean
  stdin_open?: boolean
  auto_remove?: boolean
  pull_image?: boolean
  registry?: string
}

export interface ContainerStatsResponse {
  cpu_percent: number
  memory_usage: number
  memory_limit: number
  memory_percent: number
  network_rx: number
  network_tx: number
  io_read: number
  io_write: number
  timestamp: null | string
}

export interface ImageListResponse {
  id: string
  tags: string[]
  size: number
  created: null | string
}

export interface ImageLayerResponse {
  order: number
  size: number
  layer: string
}

export interface ImageDetailResponse {
  id: string
  tags: string[]
  cmd: null | string[]
  entrypoint: null | string[]
  expose: string[]
  volume: string[]
  env: Record<string, string>
  layers: ImageLayerResponse[]
}

export interface PullImageParam {
  image: string
  tag?: string
}

export interface BuildImageParam {
  path: string
  tag: string
  dockerfile?: string
  build_args?: Record<string, string>
}

export interface RegistrySourceResponse {
  id: string
  name: string
  url: string
  is_default: boolean
}

export interface CreateRegistrySourceParam {
  name: string
  url: string
}

export interface UpdateRegistrySourceParam {
  name?: string
  url?: string
}

export interface StackListResponse {
  name: string
  status: string
  config_files: string[]
  containers: string[]
  created: null | string
  updated: null | string
}

export interface DeployStackParam {
  compose_file: string
  project_name?: string
}

export interface StopStackParam {
  project_name: string
  compose_file?: string
}

export interface RemoveStackParam {
  project_name: string
  compose_file?: string
  volumes?: boolean
}

export interface NetworkListResponse {
  id: string
  name: string
  driver: string
  scope: string
  subnet: null | string
  stack: null | string
  attachable: boolean
  ipam_driver: null | string
  ipv4_subnet: null | string
  ipv4_gateway: null | string
  ipv6_subnet: null | string
  ipv6_gateway: null | string
  ownership: null | string
  containers: string[]
}

export interface CreateNetworkParam {
  name: string
  driver?: string
  subnet?: string
  gateway?: string
}

export interface VolumeListResponse {
  name: string
  driver: string
  mountpoint: string
  created: null | string
  stack: null | string
  options: Record<string, string>
  containers: string[]
}

export interface CreateVolumeParam {
  name: string
  driver?: string
  driver_opts?: Record<string, string>
}

export interface VolumeDetailResponse {
  options: Record<string, string>
  containers: Array<{
    mounted_at: string
    name: string
    read_only: boolean
  }>
}

export interface SystemInfoResponse {
  containers: number
  containers_running: number
  containers_paused: number
  containers_stopped: number
  images: number
  driver: string
  memory_limit: boolean
  /** 宿主总内存（字节），0 表示未获取到 */
  mem_total?: number
  cpus: number
  kernel_version: string
  operating_system: string
  os_type: string
  architecture: string
  docker_version: string
}

export interface DiskUsageResponse {
  images_size: number
  containers_size: number
  volumes_size: number
  build_cache_size: number
  total_size: number
}

// ==================== 容器管理API ====================

/** Docker 列表/系统类接口可能较慢，使用更长超时（15s） */
const DOCKER_LIST_TIMEOUT = 15_000

export async function getContainerListApi(all = false) {
  return await requestClient.get<ContainerListResponse[]>(
    '/v1/docker/containers',
    { params: { all }, timeout: DOCKER_LIST_TIMEOUT },
  )
}

export async function getContainerDetailApi(containerId: string) {
  return await requestClient.get<ContainerDetailResponse>(
    `/v1/docker/containers/${containerId}`,
  )
}

export async function createContainerApi(data: CreateContainerParam) {
  return await requestClient.post('/v1/docker/containers', data)
}

export async function startContainerApi(containerId: string) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/start`,
  )
}

export async function stopContainerApi(containerId: string, timeout = 10) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/stop`,
    undefined,
    { params: { timeout } },
  )
}

export async function restartContainerApi(containerId: string, timeout = 10) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/restart`,
    undefined,
    { params: { timeout } },
  )
}

export async function pauseContainerApi(containerId: string) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/pause`,
  )
}

export async function unpauseContainerApi(containerId: string) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/unpause`,
  )
}

export async function killContainerApi(
  containerId: string,
  signal = 'SIGKILL',
) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/kill`,
    undefined,
    { params: { signal } },
  )
}

export async function removeContainerApi(containerId: string, force = false) {
  return await requestClient.delete(
    `/v1/docker/containers/${containerId}`,
    { params: { force } },
  )
}

export async function getContainerLogsApi(
  containerId: string,
  tail = 100,
  follow = false,
) {
  return await requestClient.get<string>(
    `/v1/docker/containers/${containerId}/logs`,
    { params: { tail, follow } },
  )
}

export async function renameContainerApi(containerId: string, newName: string) {
  return await requestClient.put(
    `/v1/docker/containers/${containerId}/rename`,
    undefined,
    { params: { new_name: newName } },
  )
}

export async function updateContainerRestartPolicyApi(
  containerId: string,
  restartPolicy: string,
) {
  return await requestClient.put(
    `/v1/docker/containers/${containerId}/restart-policy`,
    undefined,
    { params: { restart_policy: restartPolicy } },
  )
}

export async function connectContainerToNetworkApi(
  containerId: string,
  networkName: string,
) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/networks/${networkName}/connect`,
  )
}

export async function disconnectContainerFromNetworkApi(
  containerId: string,
  networkName: string,
) {
  return await requestClient.post(
    `/v1/docker/containers/${containerId}/networks/${networkName}/disconnect`,
  )
}

// ==================== 镜像管理API ====================

export async function getImageListApi(all = false) {
  return await requestClient.get<ImageListResponse[]>('/v1/docker/images', {
    params: { all },
    timeout: DOCKER_LIST_TIMEOUT,
  })
}

export async function getImageDetailApi(imageId: string) {
  return await requestClient.get<ImageDetailResponse>(
    `/v1/docker/images/${encodeURIComponent(imageId)}/detail`,
  )
}

export async function pullImageApi(data: PullImageParam) {
  // 拉取镜像可能需要较长时间，设置超时时间为 10 分钟（600000 毫秒）
  return await requestClient.post('/v1/docker/images/pull', data, {
    timeout: 600_000, // 10 分钟
  })
}

export async function removeImageApi(imageId: string, force = false) {
  // 对镜像 ID 进行 URL 编码，因为镜像 ID 可能包含特殊字符（如 sha256: 前缀中的冒号）
  const encodedImageId = encodeURIComponent(imageId)
  return await requestClient.delete(`/v1/docker/images/${encodedImageId}`, {
    params: { force },
  })
}

export async function buildImageApi(data: BuildImageParam) {
  return await requestClient.post('/v1/docker/images/build', data)
}

export async function buildImageFromUploadApi(
  file: File,
  tag: string,
  dockerfile: string = 'Dockerfile',
) {
  return await (requestClient as any).upload<{ id: string, tags: string[] }>(
    '/v1/docker/images/build/upload',
    { file },
    {
      params: { tag, dockerfile },
      timeout: 1_800_000, // 30 分钟
    },
  )
}

export async function exportImageApi(imageId: string): Promise<Blob> {
  // 导出镜像可能需要较长时间，设置超时时间为 5 分钟（300000 毫秒）
  return await (requestClient as any).download<Blob>(
    `/v1/docker/images/${imageId}/export`,
    {
      timeout: 300_000, // 5 分钟
    },
  )
}

export async function importImageApi(file: File) {
  // 导入镜像可能需要较长时间，设置超时时间为 10 分钟（600000 毫秒）
  return await (requestClient as any).upload<{ id: string, tags: string[] }>(
    '/v1/docker/images/import',
    { file },
    {
      timeout: 600_000, // 10 分钟
    },
  )
}

// ==================== 镜像源管理API ====================

export async function getRegistryListApi() {
  return await requestClient.get<RegistrySourceResponse[]>(
    '/v1/docker/registries',
  )
}

export async function createRegistryApi(data: CreateRegistrySourceParam) {
  return await requestClient.post('/v1/docker/registries', data)
}

export async function updateRegistryApi(
  registryId: string,
  data: UpdateRegistrySourceParam,
) {
  return await requestClient.put(
    `/v1/docker/registries/${registryId}`,
    data,
  )
}

export async function deleteRegistryApi(registryId: string) {
  return await requestClient.delete(`/v1/docker/registries/${registryId}`)
}

// ==================== 堆栈管理API ====================

export async function getStackListApi() {
  return await requestClient.get<StackListResponse[]>('/v1/docker/stacks', {
    timeout: DOCKER_LIST_TIMEOUT,
  })
}

export async function deployStackApi(data: DeployStackParam) {
  return await requestClient.post('/v1/docker/stacks/deploy', data)
}

export async function stopStackApi(data: StopStackParam) {
  return await requestClient.post('/v1/docker/stacks/stop', data)
}

export async function removeStackApi(data: RemoveStackParam) {
  return await requestClient.delete('/v1/docker/stacks/remove', {
    data,
  } as any)
}

export async function getStackServicesApi(projectName: string) {
  return await requestClient.get('/v1/docker/stacks/services', {
    params: { project_name: projectName },
  })
}

// ==================== 网络管理API ====================

export async function getNetworkListApi() {
  return await requestClient.get<NetworkListResponse[]>(
    '/v1/docker/networks',
    { timeout: DOCKER_LIST_TIMEOUT },
  )
}

export async function createNetworkApi(data: CreateNetworkParam) {
  return await requestClient.post('/v1/docker/networks', data)
}

export async function removeNetworkApi(networkId: string) {
  return await requestClient.delete(`/v1/docker/networks/${networkId}`)
}

// ==================== 卷管理API ====================

export async function getVolumeListApi() {
  return await requestClient.get<VolumeListResponse[]>(
    '/v1/docker/volumes',
    { timeout: DOCKER_LIST_TIMEOUT },
  )
}

export async function createVolumeApi(data: CreateVolumeParam) {
  return await requestClient.post('/v1/docker/volumes', data)
}

export async function getVolumeDetailApi(volumeName: string) {
  return await requestClient.get<VolumeDetailResponse>(
    `/v1/docker/volumes/${volumeName}`,
  )
}

export async function removeVolumeApi(volumeName: string) {
  return await requestClient.delete(`/v1/docker/volumes/${volumeName}`)
}

// ==================== 系统信息API ====================

export async function getSystemInfoApi() {
  return await requestClient.get<SystemInfoResponse>(
    '/v1/docker/system/info',
    { timeout: DOCKER_LIST_TIMEOUT },
  )
}

export async function getDiskUsageApi() {
  return await requestClient.get<DiskUsageResponse>('/v1/docker/system/df', {
    timeout: DOCKER_LIST_TIMEOUT,
  })
}

export interface ConnectedStatusResponse {
  connected: boolean
}

export interface SetConnectedStatusParam {
  connected: boolean
}

export async function getConnectedStatusApi() {
  return await requestClient.get<ConnectedStatusResponse>(
    '/v1/docker/system/connected',
    { timeout: DOCKER_LIST_TIMEOUT },
  )
}

export async function setConnectedStatusApi(param: SetConnectedStatusParam) {
  return await requestClient.post<{ message: string }>(
    '/v1/docker/system/connected',
    param,
  )
}
