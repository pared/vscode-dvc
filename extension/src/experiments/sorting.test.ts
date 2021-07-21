import path from 'path'
import get from 'lodash.get'
import { sortRows } from './sorting'
import { Experiment } from './webview/contract'

describe('sortRows', () => {
  const testId = 'f0778b3eb6a390d6f6731c735a2a4561d1792c3a'
  const testDisplayName = 'f0778b3'
  const testTimestamp = '2021-01-14T10:57:59'
  const irrelevantExperimentData = {
    checkpoint_parent: 'f81f1b5a1248b9d9f595fb53136298c69f908e66',
    checkpoint_tip: 'd3f4a0d3661c5977540d2205d819470cf0d2145a',
    displayName: testDisplayName,
    id: testId,
    queued: false,
    timestamp: testTimestamp
  }
  const testColumnPathArray = ['params', 'params.yaml', 'test']
  const testColumnPath = path.join(...testColumnPathArray)
  const getTestParam = (experiment: Experiment) =>
    get(experiment, testColumnPathArray)

  it('Returns unsorted rows if sort definition argument is undefined', () => {
    const unsortedRows = [{ id: 1 }, { id: 2 }] as unknown as Experiment[]
    expect(
      sortRows({ columnPath: testColumnPath, descending: false }, unsortedRows)
    ).toEqual(unsortedRows)
  })

  it('Maintains the same order if all items are equal', () => {
    const testData = [
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            sort: 1,
            test: 1
          }
        }
      },
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            sort: 1,
            test: 2
          }
        }
      },
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            sort: 1,
            test: 3
          }
        }
      }
    ]

    const testSortPath = path.join('params', 'params.yaml', 'sort')
    expect(
      (
        sortRows(
          { columnPath: testSortPath, descending: true },
          testData
        ) as Experiment[]
      ).map(getTestParam)
    ).toEqual([1, 2, 3])

    expect(
      (
        sortRows(
          { columnPath: testSortPath, descending: false },
          testData
        ) as Experiment[]
      ).map(getTestParam)
    ).toEqual([1, 2, 3])
  })

  describe('Can sort both ascending and descending', () => {
    const testData = [
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            test: 2
          }
        }
      },
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            test: 3
          }
        }
      },
      {
        ...irrelevantExperimentData,
        params: {
          'params.yaml': {
            test: 1
          }
        }
      }
    ]

    it('Can sort ascending', () => {
      expect(
        (
          sortRows(
            { columnPath: testColumnPath, descending: false },
            testData
          ) as Experiment[]
        ).map(getTestParam)
      ).toEqual([1, 2, 3])
    })

    it('Can sort descending', () => {
      expect(
        (
          sortRows(
            { columnPath: testColumnPath, descending: true },
            testData
          ) as Experiment[]
        ).map(getTestParam)
      ).toEqual([3, 2, 1])
    })
  })
})