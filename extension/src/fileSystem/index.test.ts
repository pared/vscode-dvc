import { join, resolve } from 'path'
import { ensureDirSync, remove } from 'fs-extra'
import * as FileSystem from '.'

const { exists, findDvcRootPaths, isDirectory } = FileSystem

jest.mock('../cli/reader')

beforeEach(() => {
  jest.resetAllMocks()
})

const dvcDemoPath = resolve(__dirname, '..', '..', '..', 'demo')

describe('findDvcRootPaths', () => {
  const dataRoot = resolve(dvcDemoPath, 'data')

  it('should find the dvc root if it exists in the given folder', async () => {
    const dvcRoots = await findDvcRootPaths(dvcDemoPath, Promise.resolve('.'))

    expect(dvcRoots).toEqual([dvcDemoPath])
  })

  it('should find multiple roots if available one directory below the given folder', async () => {
    const parentDir = resolve(dvcDemoPath, '..')
    const mockDvcRoot = join(parentDir, 'mockDvc')
    ensureDirSync(join(mockDvcRoot, '.dvc'))

    const dvcRoots = await findDvcRootPaths(
      parentDir,
      Promise.resolve(undefined)
    )

    remove(mockDvcRoot)

    expect(dvcRoots).toEqual([dvcDemoPath, mockDvcRoot].sort())
  })

  it('should find the dvc root if it exists above the given folder', async () => {
    const dvcRoots = await findDvcRootPaths(dataRoot, Promise.resolve('..'))

    expect(dvcRoots).toEqual([dvcDemoPath])
  })

  it('should return an empty array given no dvc root in or above the given directory', async () => {
    const dvcRoots = await findDvcRootPaths(
      __dirname,
      Promise.resolve(undefined)
    )
    expect(dvcRoots).toEqual([])
  })
})

describe('exists', () => {
  it('should return true for a directory on disk', () => {
    expect(exists(__dirname)).toBe(true)
  })
  it('should return true for a file on disk', () => {
    expect(exists(__filename)).toBe(true)
  })
  it('should return false for an empty string', () => {
    expect(exists(join(__dirname, __dirname))).toBe(false)
  })
  it('should return false for a path not on disk', () => {
    expect(exists('')).toBe(false)
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
