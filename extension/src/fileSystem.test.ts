import { window } from 'vscode'
import { FSWatcher, watch } from 'chokidar'
import { mocked } from 'ts-jest/utils'
import debounce from 'lodash.debounce'
import { join, resolve } from 'path'
import { ensureDirSync, remove } from 'fs-extra'
import * as FileSystem from './fileSystem'
import { getRoot } from './cli/reader'

const {
  addFileChangeHandler,
  findDvcRootPaths,
  getWatcher,
  isDirectory,
  pickSingleRepositoryRoot
} = FileSystem

jest.mock('chokidar')
jest.mock('lodash.debounce')
jest.mock('./cli/reader')

const mockedWatch = mocked(watch)
const mockedDebounce = mocked(debounce)
const mockGetRoot = mocked(getRoot)

const mockedShowRepoQuickPick = mocked<
  (
    items: string[],
    options: { canPickMany: false }
  ) => Thenable<string | undefined>
>(window.showQuickPick)

beforeEach(() => {
  jest.resetAllMocks()
})

const dvcDemoPath = resolve(__dirname, '..', '..', 'demo')

describe('addFileChangeHandler', () => {
  it('should call fs.watch with the correct parameters', () => {
    const file = '/some/file.csv'
    const func = () => undefined

    const mockedWatcher = mocked(new FSWatcher())
    mockedWatch.mockReturnValue(mockedWatcher)

    const getWatcherSpy = jest
      .spyOn(FileSystem, 'getWatcher')
      .mockImplementationOnce(e => e)

    mockedDebounce.mockImplementationOnce(
      (func: (...args: string[]) => void) =>
        func as {
          (...args: string[]): void
          cancel(): void
          flush(): void
        }
    )

    const { dispose } = addFileChangeHandler(file, func)

    expect(dispose).toBeDefined()

    expect(getWatcherSpy).toBeCalledTimes(1)

    expect(mockedDebounce).toBeCalledTimes(1)
    expect(mockedDebounce).toBeCalledWith(func, 500, {
      leading: false,
      trailing: true
    })

    expect(mockedWatch).toBeCalledWith(file)
    expect(mockedWatch).toBeCalledTimes(1)

    expect(mockedWatcher.on).toBeCalledTimes(4)
    expect(mockedWatcher.on).toBeCalledWith('ready', func)
    expect(mockedWatcher.on).toBeCalledWith('add', func)
    expect(mockedWatcher.on).toBeCalledWith('change', func)
    expect(mockedWatcher.on).toBeCalledWith('unlink', func)
  })
})

describe('getWatcher', () => {
  const mockHandler = jest.fn()
  const file = '/some/file/on/a/system.log'

  it('should return a new file watcher callback which calls the handler when a path is provided', () => {
    const watcher = getWatcher(mockHandler)

    watcher(file)

    expect(mockHandler).toBeCalledTimes(1)
  })

  it('should return a new file watcher callback which does not call the handler when a path is not provided', () => {
    const watcher = getWatcher(mockHandler)

    watcher('')

    expect(mockHandler).not.toBeCalled()
  })
})

describe('findDvcRootPaths', () => {
  const dataRoot = resolve(dvcDemoPath, 'data')
  const mockCliPath = 'dvc'

  it('should find the dvc root if it exists in the given folder', async () => {
    const dvcRoots = await findDvcRootPaths(dvcDemoPath, mockCliPath, undefined)

    expect(mockGetRoot).not.toBeCalled()
    expect(dvcRoots).toEqual([dvcDemoPath])
  })

  it('should find multiple roots if available one directory below the given folder', async () => {
    const parentDir = resolve(dvcDemoPath, '..')
    const mockDvcRoot = join(parentDir, 'mockDvc')
    ensureDirSync(join(mockDvcRoot, '.dvc'))

    const dvcRoots = await findDvcRootPaths(parentDir, mockCliPath, undefined)

    remove(mockDvcRoot)

    expect(mockGetRoot).not.toBeCalled()
    expect(dvcRoots).toEqual([dvcDemoPath, mockDvcRoot].sort())
  })

  it('should find the dvc root if it exists above the given folder', async () => {
    mockGetRoot.mockResolvedValueOnce('..')
    const dvcRoots = await findDvcRootPaths(dataRoot, mockCliPath, undefined)
    expect(mockGetRoot).toBeCalledTimes(1)
    expect(dvcRoots).toEqual([dvcDemoPath])
  })

  it('should return an empty array given no dvc root in or above the given directory', async () => {
    const dvcRoots = await findDvcRootPaths(__dirname, mockCliPath, undefined)
    expect(dvcRoots).toEqual([])
  })
})

describe('isDirectory', () => {
  it('should return true for a directory', () => {
    expect(isDirectory(__dirname)).toBe(true)
  })
  it('should return false for a file', () => {
    expect(isDirectory(__filename)).toBe(false)
  })
  it('should return false for an empty string', () => {
    expect(isDirectory('')).toBe(false)
  })
})

describe('pickSingleRepositoryRoot', () => {
  it('should return the optional repository if provided', async () => {
    const optionallyProvidedRepo = '/some/path/to/repo/b'

    const repoRoot = await pickSingleRepositoryRoot(
      '/some/path/to',
      undefined,
      optionallyProvidedRepo
    )
    expect(repoRoot).toEqual(optionallyProvidedRepo)
  })

  it('should return the single repository if only one is found', async () => {
    const singleRepo = '/some/path/to/repo/a'

    jest
      .spyOn(FileSystem, 'findDvcRootPaths')
      .mockResolvedValueOnce([singleRepo])

    const repoRoot = await pickSingleRepositoryRoot(singleRepo, undefined)
    expect(repoRoot).toEqual(singleRepo)
  })

  it('should return the selected option if multiple repositories are found and one is selected', async () => {
    const selectedRepo = '/some/path/to/repo/a'
    const unselectedRepoB = '/some/path/to/repo/b'
    const unselectedRepoC = '/some/path/to/repo/c'

    mockedShowRepoQuickPick.mockResolvedValue(selectedRepo)

    jest
      .spyOn(FileSystem, 'findDvcRootPaths')
      .mockResolvedValueOnce([selectedRepo, unselectedRepoB, unselectedRepoC])

    const repoRoot = await pickSingleRepositoryRoot('/some/path/to', undefined)
    expect(repoRoot).toEqual(selectedRepo)
  })

  it('should return undefined if multiple repositories are found but none are selected', async () => {
    const selectedRepo = '/some/path/to/repo/a'
    const unselectedRepoB = '/some/path/to/repo/b'
    const unselectedRepoC = '/some/path/to/repo/c'

    mockedShowRepoQuickPick.mockResolvedValue(undefined)

    jest
      .spyOn(FileSystem, 'findDvcRootPaths')
      .mockResolvedValueOnce([selectedRepo, unselectedRepoB, unselectedRepoC])

    const repoRoot = await pickSingleRepositoryRoot('/some/path/to', undefined)
    expect(repoRoot).toBeUndefined()
  })
})
