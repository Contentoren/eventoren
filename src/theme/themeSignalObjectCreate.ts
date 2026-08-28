import { type Accessor, createSignal, type Setter } from "solid-js"

type ThemeSignalObject<T> = {
  get: Accessor<T>
  set: Setter<T>
}

export function themeSignalObjectCreate<T>(initialValue: T): ThemeSignalObject<T> {
  const [get, set] = createSignal(initialValue)
  return { get, set }
}
