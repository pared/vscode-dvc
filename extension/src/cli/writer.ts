import { ensureDir } from 'fs-extra'
import { basename, dirname } from 'path'
import {
  Args,
  Command,
  ExperimentFlag,
  ExperimentSubCommands,
  Flag,
  GcPreserveFlag
} from './args'
import {
  BaseExecutionOptions,
  ExecutionOptions,
  runCliProcess
} from './execution'

export const checkout = async (options: ExecutionOptions): Promise<string> =>
  runCliProcess(options, Command.CHECKOUT)

export const commit = async (options: ExecutionOptions): Promise<string> =>
  runCliProcess(options, Command.COMMIT, Flag.FORCE)

export const experimentGarbageCollect = async (
  options: ExecutionOptions,
  preserveFlags: GcPreserveFlag[]
): Promise<string> =>
  runCliProcess(
    options,
    Command.EXPERIMENT,
    ExperimentSubCommands.GARBAGE_COLLECT,
    Flag.FORCE,
    ExperimentFlag.WORKSPACE,
    ...preserveFlags
  )

export const initializeDirectory = async (
  options: ExecutionOptions
): Promise<string> =>
  runCliProcess(options, Command.INITIALIZE, Flag.SUBDIRECTORY)

export const queueExperiment = async (
  options: ExecutionOptions
): Promise<string> =>
  runCliProcess(
    options,
    Command.EXPERIMENT,
    ExperimentSubCommands.RUN,
    ExperimentFlag.QUEUE
  )

type ExecutionOnTargetOptions = BaseExecutionOptions & {
  fsPath: string
}

const runCliProcessOnTarget = async (
  options: ExecutionOnTargetOptions,
  ...args: Args
): Promise<string> => {
  const { fsPath, cliPath, pythonBinPath } = options

  const cwd = dirname(fsPath)

  const target = basename(fsPath)
  await ensureDir(cwd)

  return runCliProcess({ cwd, cliPath, pythonBinPath }, ...args, target)
}

export const addTarget = async (
  options: ExecutionOnTargetOptions
): Promise<string> => runCliProcessOnTarget(options, Command.ADD)

export const checkoutTarget = (
  options: ExecutionOnTargetOptions
): Promise<string> => runCliProcessOnTarget(options, Command.CHECKOUT)

export const commitTarget = (
  options: ExecutionOnTargetOptions
): Promise<string> => runCliProcessOnTarget(options, Command.COMMIT, Flag.FORCE)

export const pullTarget = async (
  options: ExecutionOnTargetOptions
): Promise<string> => runCliProcessOnTarget(options, Command.PULL)

export const pushTarget = async (
  options: ExecutionOnTargetOptions
): Promise<string> => runCliProcessOnTarget(options, Command.PUSH)
