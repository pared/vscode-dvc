import isEqual from 'lodash.isequal'

export const definedAndNonEmpty = (
  maybeArray: readonly unknown[] | undefined
): maybeArray is unknown[] => {
  return !!maybeArray?.length
}

export const uniqueValues = <T = string>(array: T[]): T[] => [
  ...new Set<T>(array)
]

export const flattenUnique = <T = string>(arrayOfArrays: T[][]): T[] =>
  uniqueValues(arrayOfArrays.flat())

export const joinTruthyItems = (array: (string | undefined)[], sep = ' ') =>
  array.filter(Boolean).join(sep)

export const sameContents = (
  array: (null | string | number | undefined)[],
  otherArray: (null | string | number | undefined)[]
) => isEqual(array.sort(), otherArray.sort())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reorderObjectList = <T extends { [key: string]: any }>(
  order: string[],
  items: T[],
  compareKey: string
): T[] =>
  order
    .map(orderedItem => items.find(item => item[compareKey] === orderedItem))
    .filter(Boolean) as T[]

export const splitMatchedOrdered = <T>(values: T[], existingOrder: T[]) => {
  const orderedMatches: T[] = []
  const unmatched = [...values]
  for (const existingValue of existingOrder) {
    const index = unmatched.indexOf(existingValue)
    if (index === -1) {
      continue
    }
    unmatched.splice(index, 1)
    orderedMatches.push(existingValue)
  }

  return [orderedMatches, unmatched]
}

export const reorderListSubset = <T>(subset: T[], supersetOrder: T[]): T[] =>
  splitMatchedOrdered(subset, supersetOrder)[0]
