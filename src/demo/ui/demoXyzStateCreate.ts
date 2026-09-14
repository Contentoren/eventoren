import { createSignalObject } from "#ui/utils/createSignalObject.js"

type DemoView = "overview" | "activity"

export function demoXyzStateCreate() {
  const view = createSignalObject<DemoView>("overview")
  const completedTaskIds = createSignalObject<readonly string[]>(["brief"])

  return {
    view: view.get,
    viewChoose: (value: DemoView) => view.set(value),
    taskIsComplete: (taskId: string) => completedTaskIds.get().includes(taskId),
    completedTaskCount: completedTaskIds.get,
    taskToggle: (taskId: string) => {
      completedTaskIds.set(
        completedTaskIds.get().includes(taskId)
          ? completedTaskIds.get().filter((entry) => entry !== taskId)
          : [...completedTaskIds.get(), taskId],
      )
    },
  }
}
