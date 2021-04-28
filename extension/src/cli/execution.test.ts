import { createProcess, Process } from '../processExecution'
import { Commands } from './commands'
import { spawnProcess } from './execution'
import { mocked } from 'ts-jest/utils'
import { getProcessEnv } from '../env'

jest.mock('../env')
jest.mock('../processExecution')

const mockedGetEnv = mocked(getProcessEnv)
const mockedCreateProcess = mocked(createProcess)

mockedCreateProcess.mockReturnValue(({
  on: jest.fn(),
  all: { on: jest.fn() }
} as unknown) as Process)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('spawnProcess', () => {
  it('should pass the correct details to execa given no path to the cli or python binary path', async () => {
    const existingPath = '/Users/robot/some/path:/Users/robot/yarn/path'
    const processEnv = { PATH: existingPath, SECRET_KEY: 'abc123' }
    const cwd = __dirname
    const args = [Commands.CHECKOUT]
    mockedGetEnv.mockReturnValueOnce(processEnv)

    await spawnProcess({
      options: {
        cliPath: '',
        cwd,
        pythonBinPath: undefined
      },
      args
    })

    expect(mockedCreateProcess).toBeCalledWith({
      executable: 'dvc',
      args,
      cwd,
      env: processEnv
    })
  })

  it('should pass the correct details to execa given a path to the cli but no python binary path', async () => {
    const existingPath = '/do/not/need/a/path'
    const processEnv = { PATH: existingPath }
    const cliPath = '/some/path/to/dvc'
    const cwd = __dirname
    const args = [Commands.CHECKOUT]
    mockedGetEnv.mockReturnValueOnce(processEnv)

    await spawnProcess({
      options: {
        cliPath,
        cwd,
        pythonBinPath: undefined
      },
      args
    })

    expect(mockedCreateProcess).toBeCalledWith({
      executable: cliPath,
      args,
      cwd,
      env: processEnv
    })
  })

  it('should pass the correct details to execa given a path to the cli, an existing PATH variable and a python binary path', async () => {
    const existingPath =
      '/var/folders/q_/jpcf1bld2vz9fs5n62mgqshc0000gq/T/yarn--1618526061412-0.878957498634626:' +
      '/Users/robot/PP/vscode-dvc/extension/node_modules/.bin:' +
      '/Users/robot/.config/yarn/link/node_modules/.bin:/Users/robot/.nvm/versions/node/v12.20.1/libexec/lib/node_modules/npm/bin/node-gyp-bin'
    mockedGetEnv.mockReturnValueOnce({ PATH: existingPath })

    const cliPath = '/some/path/to/dvc'
    const pythonBinPath = '/some/conda/path/bin'

    const cwd = __dirname
    const args = [Commands.PUSH]

    await spawnProcess({
      options: {
        cliPath,
        cwd,
        pythonBinPath
      },
      args
    })

    expect(mockedCreateProcess).toBeCalledWith({
      executable: cliPath,
      args,
      cwd,
      env: { PATH: `${pythonBinPath}:${existingPath}` }
    })
  })

  it('should pass a sane path to spawn if there is a python binary path but no existing PATH variable', async () => {
    const existingPath = ''
    mockedGetEnv.mockReturnValueOnce({ PATH: existingPath })

    const pythonBinPath = '/some/conda/path/bin'

    const cwd = __dirname
    const args = [Commands.PULL]

    await spawnProcess({
      options: {
        cliPath: undefined,
        cwd,
        pythonBinPath
      },
      args
    })

    expect(mockedCreateProcess).toBeCalledWith({
      executable: 'dvc',
      args,
      cwd,
      env: { PATH: `${pythonBinPath}` }
    })
  })
})
