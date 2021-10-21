import { join, resolve } from 'path'
import { EventEmitter, Event } from 'vscode'
import { Disposable } from '@hediet/std/disposable'
import { Deferred } from '@hediet/std/synchronization'
import {
  createFileSystemWatcher,
  createNecessaryFileSystemWatcher
} from '../fileSystem/watcher'
import { getGitRepositoryRoot } from '../git'
import { ProcessManager } from '../processManager'
import { AvailableCommands, InternalCommands } from '../commands/internal'
import { ExperimentsRepoJSONOutput } from '../cli/reader'
import { sameContents, uniqueValues } from '../util/array'
import { collectFiles } from '../experiments/paramsAndMetrics/collect'

const DOT_GIT = '.git'
const GIT_REFS = join(DOT_GIT, 'refs')
export const EXPERIMENTS_GIT_REFS = join(GIT_REFS, 'exps')

export class Data {
  public readonly dispose = Disposable.fn()
  public readonly onDidChangeExperimentsData: Event<ExperimentsRepoJSONOutput>

  private readonly dvcRoot: string
  private files: string[] = []

  private readonly deferred = new Deferred()
  private readonly initialized = this.deferred.promise

  private readonly processManager: ProcessManager
  private readonly internalCommands: InternalCommands

  private readonly experimentsDataChanged: EventEmitter<ExperimentsRepoJSONOutput> =
    this.dispose.track(new EventEmitter())

  private readonly paramsAndMetricsFilesChanged = new EventEmitter<void>()
  private readonly onDidChangeParamsAndMetricsFiles: Event<void> =
    this.paramsAndMetricsFilesChanged.event

  private watcher?: Disposable

  constructor(dvcRoot: string, internalCommands: InternalCommands) {
    this.dvcRoot = dvcRoot
    this.processManager = new ProcessManager({
      name: 'update',
      process: () => this.updateData()
    })

    this.internalCommands = internalCommands
    this.onDidChangeExperimentsData = this.experimentsDataChanged.event

    this.initialize()
    this.watchExpGitRefs()
  }

  public isReady() {
    return this.initialized
  }

  public update() {
    return this.processManager.run('update')
  }

  private initialize() {
    const waitForInitialData = this.dispose.track(
      this.onDidChangeExperimentsData(() => {
        this.watcher = this.watchParamsAndMetricsFiles()

        this.dispose.track(
          this.onDidChangeParamsAndMetricsFiles(() => {
            const watcher = this.watchParamsAndMetricsFiles()
            this.dispose.untrack(this.watcher)
            this.watcher?.dispose()
            this.watcher = watcher
          })
        )
        this.dispose.untrack(waitForInitialData)
        waitForInitialData.dispose()
        this.deferred.resolve()
      })
    )
    this.update()
  }

  private async watchExpGitRefs(): Promise<void> {
    const gitRoot = await getGitRepositoryRoot(this.dvcRoot)
    const dotGitGlob = resolve(gitRoot, DOT_GIT, '**')
    this.dispose.track(
      createNecessaryFileSystemWatcher(dotGitGlob, (path: string) => {
        if (
          path.includes('HEAD') ||
          path.includes(EXPERIMENTS_GIT_REFS) ||
          path.includes(join(GIT_REFS, 'heads'))
        ) {
          return this.update()
        }
      })
    )
  }

  private async updateData(): Promise<void> {
    const data =
      await this.internalCommands.executeCommand<ExperimentsRepoJSONOutput>(
        AvailableCommands.EXPERIMENT_SHOW,
        this.dvcRoot
      )

    this.transformAndSetFiles(data)

    return this.notifyChanged(data)
  }

  private transformAndSetFiles(data: ExperimentsRepoJSONOutput) {
    const files = collectFiles(data)

    if (sameContents(this.files, files)) {
      return
    }

    this.files = files
    this.paramsAndMetricsFilesChanged.fire()
  }

  private notifyChanged(data: ExperimentsRepoJSONOutput) {
    this.experimentsDataChanged.fire(data)
  }

  private watchParamsAndMetricsFiles() {
    return this.dispose.track(
      createFileSystemWatcher(
        join(
          this.dvcRoot,
          '**',
          `{${uniqueValues([
            'dvc.lock',
            'dvc.yaml',
            'params.yaml',
            ...this.files
          ]).join(',')}}`
        ),
        () => this.update()
      )
    )
  }
}