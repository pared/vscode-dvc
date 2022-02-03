import { ExperimentsOutput } from '../../../cli/reader'
import { collectMetricsAndParams } from '../../../experiments/metricsAndParams/collect'
import { collectExperiments } from '../../../experiments/model/collect'
import { TableData } from '../../../experiments/webview/contract'

export const deeplyNestedOutput: ExperimentsOutput = {
  workspace: {
    baseline: {
      data: {
        timestamp: null,
        params: {
          'params.yaml': {
            data: {
              nested1: {
                doubled: 'first instance!',
                nested2: {
                  nested3: {
                    nested4: {
                      nested5: { nested6: { nested7: 'Lucky!' } },
                      nested5b: {
                        nested6: 'Wow!!!!!!!!!!!!!!!!!!!!',
                        doubled: 'second instance!'
                      }
                    }
                  }
                }
              },
              outlier: 1
            }
          }
        },
        queued: false,
        running: false,
        executor: null
      }
    }
  }
}

export const columns = collectMetricsAndParams(deeplyNestedOutput)

const { workspace, branches } = collectExperiments(deeplyNestedOutput)
export const rows = [workspace, ...branches]

const deeplyNestedTableData: TableData = {
  changes: [],
  columnOrder: [],
  columnWidths: {},
  sorts: [],
  columns,
  rows
}

export default deeplyNestedTableData