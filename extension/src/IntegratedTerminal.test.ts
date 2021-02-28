import {
  IntegratedTerminal,
  runExperiment,
  initializeDirectory,
  add,
  checkout,
  checkoutRecursive
} from './IntegratedTerminal'
import path from 'path'

describe('runExperiment', () => {
  it('should run the correct command in the IntegratedTerminal', async () => {
    const terminalSpy = jest
      .spyOn(IntegratedTerminal, 'run')
      .mockResolvedValueOnce(undefined)

    const undef = await runExperiment()
    expect(undef).toBeUndefined()

    expect(terminalSpy).toBeCalledWith('dvc exp run ')
  })
})

describe('initializeDirectory', () => {
  it('should run the correct command in the IntegratedTerminal', async () => {
    const terminalSpy = jest
      .spyOn(IntegratedTerminal, 'run')
      .mockResolvedValueOnce(undefined)

    const undef = await initializeDirectory('./test/dir')
    expect(undef).toBeUndefined()

    expect(terminalSpy).toBeCalledWith('cd ./test/dir && dvc init --subdir ')
  })
})

describe('add', () => {
  it('should run the correct command in the IntegratedTerminal', async () => {
    const terminalSpy = jest
      .spyOn(IntegratedTerminal, 'run')
      .mockResolvedValueOnce(undefined)

    const undef = await add(path.resolve(__dirname, './fileSystem.js'))
    expect(undef).toBeUndefined()

    expect(terminalSpy).toBeCalledWith(`dvc add src\\fileSystem.js`)
  })
})

describe('checkout', () => {
  it('should run the correct command in the IntegratedTerminal', async () => {
    const terminalSpy = jest
      .spyOn(IntegratedTerminal, 'run')
      .mockResolvedValueOnce(undefined)

    const undef = await checkout('../test/dir')
    expect(undef).toBeUndefined()

    expect(terminalSpy).toBeCalledWith(`dvc checkout ../test/dir`)
  })
})

describe('checkout recursive', () => {
  it('should run the correct command in the IntegratedTerminal', async () => {
    const terminalSpy = jest
      .spyOn(IntegratedTerminal, 'run')
      .mockResolvedValueOnce(undefined)

    const undef = await checkoutRecursive('../test/dir')
    expect(undef).toBeUndefined()

    expect(terminalSpy).toBeCalledWith(`dvc checkout --recursive ../test/dir`)
  })
})
