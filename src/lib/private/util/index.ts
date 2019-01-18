export const Arr = {
  init: <E>(arr: E[]): E[] => arr.slice(0, -1),
  last: <E>(arr: E[]): E => arr[arr.length - 1],
  tail: <E>(arr: E[]): E[] => arr.slice(1),
  first: <E>(arr: E[]): E => arr[0]
}

export type SerItem =
  | { val: any }
  | { ref: Path }
  | { obj: SerObj }
  | { fun: any }
  | { sym: string }
  | SerArr
  | { proto: string; state: SerItem }

export type SerObj = { [key: string]: SerItem }

export interface SerArr extends Array<SerItem> {}

export type Path = string[]
export const Path = {
  find(root: {}, path: Path): any {
    let result: any = root

    for (const p of path) {
      if (result === undefined) return undefined
      result = result[p]
    }

    return result
  },
  copyProperty(root: {}, sourcePath: Path, targetPath: Path) {
    const sourceItem = Path.find(root, sourcePath)
    const targetItem = Path.find(root, Arr.init(targetPath))
    targetItem[Arr.last(targetPath)] = sourceItem
  }
}

export type Action =
  | { target: Path; source: Path }
  | { convertTo: string; path: Path }
export const Action = {
  depth(action: Action): number {
    if ('path' in action) return action.path.length
    return action.source.length
  },
  compare(a1: Action, a2: Action) {
    return Action.depth(a2) - Action.depth(a1)
  }
}
