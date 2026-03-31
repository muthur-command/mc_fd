import type { EChartsOption } from 'echarts'
import type { Ref } from 'vue'

import * as echarts from 'echarts'

export type EchartsUIType = echarts.ECharts | undefined

export function useEcharts(chartRef: Ref<{ chartRef?: HTMLElement | null } | undefined>) {
  let chart: echarts.ECharts | null = null

  function renderEcharts(options: EChartsOption, clear = false) {
    const comp = chartRef.value as { chartRef?: HTMLElement | null, $el?: HTMLElement } | undefined
    const el = comp?.chartRef ?? comp?.$el
    if (!el)
      return
    if (!chart)
      chart = echarts.init(el)
    if (clear)
      chart.clear()
    chart.setOption(options, { notMerge: clear })
  }

  function dispose() {
    chart?.dispose()
    chart = null
  }

  return { renderEcharts, dispose }
}
