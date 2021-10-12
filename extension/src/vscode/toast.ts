import { window } from 'vscode'
import { Response } from './response'

export const getYesOrNoOrNever = (
  message: string
): Thenable<string | undefined> =>
  window.showInformationMessage(
    message,
    Response.YES,
    Response.NO,
    Response.NEVER
  )