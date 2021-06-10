import { Disposable } from '@hediet/std/disposable'
import { StatusBarItem, window } from 'vscode'
import { ICli } from './cli'

export class Status {
  public dispose = Disposable.fn()

  private statusBarItem: StatusBarItem = this.dispose.track(
    window.createStatusBarItem()
  )

  private workers = 0
  private available = false

  private getText = (isWorking: boolean) => {
    if (!this.available) {
      return '$(circle-slash) DVC'
    }
    if (isWorking) {
      return '$(loading~spin) DVC'
    }
    return '$(circle-large-outline) DVC'
  }

  private setStatusText = (isWorking: boolean) => {
    this.statusBarItem.text = this.getText(isWorking)
  }

  private addWorker = () => {
    this.workers = this.workers + 1
    this.setStatusText(true)
  }

  private removeWorker = () => {
    this.workers = Math.max(this.workers - 1, 0)
    if (!this.workers) {
      this.setStatusText(false)
    }
  }

  public setAvailability = (available: boolean) => {
    this.available = available
    this.setStatusText(!!this.workers)
  }

  constructor(cliInteractors: ICli[]) {
    this.statusBarItem.text = this.getText(false)
    this.statusBarItem.show()
    this.statusBarItem.tooltip = 'DVC Extension Status'

    cliInteractors.forEach(cli => {
      this.dispose.track(
        cli.onDidStartProcess(() => {
          this.addWorker()
        })
      )

      this.dispose.track(
        cli.onDidCompleteProcess(() => {
          this.removeWorker()
        })
      )
    })
  }
}