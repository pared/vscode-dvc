import { Config } from './Config'
import { Disposable } from '@hediet/std/disposable'
import { getAllUntracked } from './git'
import { SourceControlManagement } from './views/SourceControlManagement'
import { DecorationProvider } from './DecorationProvider'
import { Uri } from 'vscode'
import { Deferred } from '@hediet/std/synchronization'
import { status, listDvcOnlyRecursive } from './cli/reader'
import { dirname, join } from 'path'

enum Status {
  DELETED = 'deleted',
  MODIFIED = 'modified',
  NEW = 'new',
  NOT_IN_CACHE = 'not in cache'
}

enum ChangedType {
  CHANGED_OUTS = 'changed outs',
  CHANGED_DEPS = 'changed deps'
}

type StatusOutput = Record<string, (ValidStageOrFileStatuses | string)[]>

type FilteredStatusOutput = Record<string, ValidStageOrFileStatuses[]>

type ValidStageOrFileStatuses = Record<ChangedType, PathStatus>

type PathStatus = Record<string, Status>

export class Repository {
  public readonly dispose = Disposable.fn()

  private readonly _initialized = new Deferred()
  private readonly initialized = this._initialized.promise

  public get ready() {
    return this.initialized
  }

  private config: Config
  private dvcRoot: string
  private decorationProvider?: DecorationProvider
  private scm?: SourceControlManagement

  deleted: Uri[] = []
  modified: Uri[] = []
  new: Uri[] = []
  notInCache: Uri[] = []

  private filterRootDir(dirs: string[], rootDir: string) {
    return dirs.filter(dir => dir !== rootDir)
  }

  private getAbsolutePath(rootDir: string, files: string[]): string[] {
    return files.map(file => join(rootDir, file))
  }

  private getAbsoluteParentPath(rootDir: string, files: string[]): string[] {
    return this.filterRootDir(
      files.map(file => join(rootDir, dirname(file))),
      rootDir
    )
  }

  public async getDvcTracked(
    cwd: string,
    cliPath: string | undefined
  ): Promise<Set<string>> {
    const dvcListFiles = await listDvcOnlyRecursive({ cwd, cliPath })

    return new Set([
      ...this.getAbsolutePath(cwd, dvcListFiles),
      ...this.getAbsoluteParentPath(cwd, dvcListFiles)
    ])
  }

  private filterExcludedStagesOrFiles(
    statusOutput: StatusOutput
  ): FilteredStatusOutput {
    const excludeAlwaysChanged = (stageOrFile: string): boolean =>
      !statusOutput[stageOrFile].includes('always changed')

    const reduceToFiltered = (
      filteredStatusOutput: FilteredStatusOutput,
      stageOrFile: string
    ) => {
      filteredStatusOutput[stageOrFile] = statusOutput[
        stageOrFile
      ] as ValidStageOrFileStatuses[]
      return filteredStatusOutput
    }

    return Object.keys(statusOutput)
      .filter(excludeAlwaysChanged)
      .reduce(reduceToFiltered, {})
  }

  private getFileOrStageStatuses(
    fileOrStage: ValidStageOrFileStatuses[]
  ): PathStatus[] {
    return fileOrStage
      .map(
        entry =>
          entry?.[ChangedType.CHANGED_DEPS] || entry?.[ChangedType.CHANGED_OUTS]
      )
      .filter(value => value)
  }

  private reduceStatuses(
    reducedStatus: Partial<Record<Status, string[]>>,
    statuses: PathStatus[]
  ) {
    return statuses.map(entry =>
      Object.entries(entry).map(([relativePath, status]) => {
        const existingPaths = reducedStatus[status] || []
        reducedStatus[status] = [...new Set([...existingPaths, relativePath])]
      })
    )
  }

  private reduceToPathStatuses(
    filteredStatusOutput: FilteredStatusOutput
  ): Partial<Record<Status, string[]>> {
    const statusReducer = (
      reducedStatus: Partial<Record<Status, string[]>>,
      entry: ValidStageOrFileStatuses[]
    ): Partial<Record<Status, string[]>> => {
      const statuses = this.getFileOrStageStatuses(entry)

      this.reduceStatuses(reducedStatus, statuses)

      return reducedStatus
    }

    return Object.values(filteredStatusOutput).reduce(statusReducer, {})
  }

  private getUriStatuses(
    pathStatuses: Partial<Record<Status, string[]>>,
    dvcRoot: string
  ): Partial<Record<Status, Uri[]>> {
    return Object.entries(pathStatuses).reduce(
      (uriStatuses, [status, paths]) => {
        uriStatuses[status as Status] = paths?.map(path =>
          Uri.file(join(dvcRoot, path))
        )
        return uriStatuses
      },
      {} as Partial<Record<Status, Uri[]>>
    )
  }

  public async getStatus(options: {
    dvcRoot: string
    cliPath: string | undefined
  }): Promise<Partial<Record<Status, Uri[]>>> {
    const { dvcRoot, cliPath } = options

    const statusOutput = (await status({ cliPath, cwd: dvcRoot })) as Record<
      string,
      (ValidStageOrFileStatuses | string)[]
    >

    const filteredStatusOutput = this.filterExcludedStagesOrFiles(statusOutput)
    const pathStatuses = this.reduceToPathStatuses(filteredStatusOutput)

    return this.getUriStatuses(pathStatuses, dvcRoot)
  }

  public async updateStatus() {
    const status = await this.getStatus({
      dvcRoot: this.dvcRoot,
      cliPath: this.config.dvcPath
    })

    this.modified = status.modified || []
    this.deleted = status.deleted || []
    this.new = status.new || []
    this.notInCache = status['not in cache'] || []
  }

  public async updateTracked() {
    const untrackedChanges = await getAllUntracked(this.dvcRoot)
    return this.scm?.setUntracked(untrackedChanges)
  }

  constructor(
    dvcRoot: string,
    config: Config,
    decorationProvider?: DecorationProvider
  ) {
    this.config = config
    this.decorationProvider = decorationProvider
    this.dvcRoot = dvcRoot

    Promise.all([
      this.getDvcTracked(dvcRoot, this.config.dvcPath),
      getAllUntracked(dvcRoot),
      this.getStatus({
        dvcRoot: this.dvcRoot,
        cliPath: this.config.dvcPath
      })
    ])
      .then(promises => {
        const [files, untracked, status] = promises

        this.decorationProvider?.setTrackedFiles(files)

        this.scm = this.dispose.track(
          new SourceControlManagement(dvcRoot, {
            modified: status.modified || [],
            untracked
          })
        )
      })
      .then(() => this._initialized.resolve())
  }
}
