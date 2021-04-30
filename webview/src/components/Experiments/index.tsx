import React from 'react'
import {
  ExperimentsRepoJSONOutput,
  MessageFromWebviewType
} from 'dvc/src/webviews/experiments/contract'
import {
  Row,
  Column,
  ColumnInstance,
  useTable,
  useGroupBy,
  useExpanded,
  useSortBy,
  useFlexLayout,
  SortByFn
} from 'react-table'
import dayjs from '../../dayjs'
import { Table } from '../Table'
import parseExperiments, {
  Experiment,
  ExperimentWithId
} from '../../util/parse-experiments'

import styles from '../Table/styles.module.scss'

import buildDynamicColumns from '../../util/build-dynamic-columns'

import { VsCodeApi } from '../../model/Model'
import SortIndicator from '../SortIndicator'
import ManageColumns from '../ManageColumns'

const countRowsAndAddIndexes: (
  rows: Row<Experiment>[],
  index?: number
) => number = (rows, index = 0) => {
  for (const row of rows) {
    row.flatIndex = index
    index += 1
    if (row.isExpanded) {
      index = countRowsAndAddIndexes(row.subRows, index)
    }
  }
  return index
}

const isDesc = (direction: boolean | 'desc') =>
  direction === false || direction === 'desc'

const sortByDirection = (desc: boolean, sortInt: number) =>
  desc ? -sortInt : sortInt

const sortByFirstDirection = (
  direction: boolean | 'desc',
  rowA: Row<Experiment>,
  rowB: Row<Experiment>
) => (isDesc(direction) ? rowA.index - rowB.index : rowB.index - rowA.index)

const getSortedRows = (
  rows: Row<Experiment>[],
  sortFns: SortByFn<Experiment>[],
  directions: (boolean | 'desc')[]
): Row<Experiment>[] =>
  [...rows].sort((rowA, rowB) => {
    for (let i = 0; i < sortFns.length; i += 1) {
      const sortFn = sortFns[i]
      const desc = isDesc(directions[i])
      const sortInt = sortFn(rowA, rowB, '', desc)
      if (sortInt !== 0) {
        return sortByDirection(desc, sortInt)
      }
    }
    return sortByFirstDirection(directions[0], rowA, rowB)
  })

const orderByFn = (
  rows: Row<Experiment>[],
  sortFns: SortByFn<Experiment>[],
  directions: (boolean | 'desc')[],
  parentRow: Row<Experiment>
): Row<Experiment>[] => {
  if (parentRow && parentRow.depth === 0) {
    return getSortedRows(rows, sortFns, directions)
  } else {
    return rows
  }
}

const getColumns = (flatExperiments: ExperimentWithId[]) => [
  {
    Header: 'Experiment',
    id: 'id',
    accessor: ({ name, id }: { name: string | undefined; id: string }) => {
      if (name) {
        return name
      }
      if (id === 'workspace') {
        return id
      }
      return id.slice(0, 7)
    },
    width: 150
  },
  {
    Header: 'Timestamp',
    accessor: 'timestamp',
    Cell: ({ value }: { value: string }) => {
      if (!value || value === '') {
        return null
      }
      const time = dayjs(value)
      return time.format(time.isToday() ? 'HH:mm:ss' : 'YYYY/MM/DD')
    }
  },
  ...buildDynamicColumns(flatExperiments)
]

export const ExperimentsTable: React.FC<{
  experiments: ExperimentsRepoJSONOutput
}> = ({ experiments: rawExperiments }) => {
  const [initialState, defaultColumn] = React.useMemo(() => {
    const initialState = {}
    const defaultColumn: Partial<Column<Experiment>> = {
      width: 110
    }
    return [initialState, defaultColumn]
  }, [])

  const [data, columns] = React.useMemo(() => {
    const { experiments, flatExperiments } = parseExperiments(rawExperiments)
    const columns = getColumns(flatExperiments) as Column<Experiment>[]
    return [experiments, columns]
  }, [rawExperiments])

  const instance = useTable<Experiment>(
    {
      columns,
      data,
      initialState,
      defaultColumn,
      orderByFn,
      expandSubRows: false,
      autoResetExpanded: false
    },
    useFlexLayout,
    hooks => {
      hooks.stateReducers.push((state, action) => {
        if (action.type === 'set-ungrouped') {
          return {
            ...state,
            ungrouped: action.setting || !state.ungrouped
          }
        }
        return state
      })
    },
    useGroupBy,
    useSortBy,
    useExpanded,
    hooks => {
      hooks.useInstance.push(instance => {
        const { allColumns, rows } = instance
        const sortedColumns: ColumnInstance<Experiment>[] = allColumns.filter(
          column => column.isSorted
        )
        const expandedRowCount = countRowsAndAddIndexes(rows)
        Object.assign(instance, {
          sortedColumns,
          expandedRowCount
        })
      })
    }
  )

  const { toggleAllRowsExpanded } = instance

  React.useEffect(() => {
    toggleAllRowsExpanded()
  }, [toggleAllRowsExpanded])

  return (
    <>
      <div className={styles.tableOptions}>
        <ManageColumns instance={instance} />
        <SortIndicator instance={instance} />
      </div>
      <Table instance={instance} />
    </>
  )
}

const Experiments: React.FC<{
  experiments?: ExperimentsRepoJSONOutput | null
  vsCodeApi: VsCodeApi
}> = ({ experiments, vsCodeApi }) => {
  return (
    <div className={styles.experiments}>
      <button
        className={styles.experimentsButton}
        onClick={() => {
          vsCodeApi.postMessage({
            type: MessageFromWebviewType.onClickRunExperiment
          })
        }}
      >
        Run Experiment
      </button>
      {experiments ? (
        <ExperimentsTable experiments={experiments} />
      ) : (
        <p>Loading experiments...</p>
      )}
    </div>
  )
}

export default Experiments
