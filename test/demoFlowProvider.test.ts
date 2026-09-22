import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { demoFlowContextUse } from "../src/demo/state/demoFlowContextUse.ts"
import { demoFlowProviderStateCreate } from "../src/demo/state/demoFlowProviderStateCreate.ts"

test("demoFlowContextUse returns default loaded values outside provider", () => {
  const flow = demoFlowContextUse()
  expect(flow.state()).toBe("loaded")
  expect(flow.isLoaded()).toBe(true)
  expect(flow.isLoading()).toBe(false)
  expect(flow.isEmpty()).toBe(false)
  expect(flow.isError()).toBe(false)
  expect(flow.hasFlowStates()).toBe(false)
})

test("demoFlowProviderStateCreate initializes with route default state", () => {
  createRoot((dispose) => {
    const { context } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/events",
    })

    expect(context.state()).toBe("loaded")
    expect(context.isLoaded()).toBe(true)
    expect(context.isLoading()).toBe(false)
    expect(context.isEmpty()).toBe(false)
    expect(context.isError()).toBe(false)
    expect(context.hasFlowStates()).toBe(true)
    expect(context.defaultState()).toBe("loaded")

    dispose()
  })
})

test("demoFlowProviderStateCreate respects canonical route default states", () => {
  createRoot((dispose) => {
    const { context: emptyContext } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/events-empty",
    })
    expect(emptyContext.state()).toBe("empty")
    expect(emptyContext.isEmpty()).toBe(true)
    expect(emptyContext.defaultState()).toBe("empty")

    const { context: errorContext } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/orders-error",
    })
    expect(errorContext.state()).toBe("error")
    expect(errorContext.isError()).toBe(true)
    expect(errorContext.defaultState()).toBe("error")

    const { context: loadingContext } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/checkout-loading",
    })
    expect(loadingContext.state()).toBe("loading")
    expect(loadingContext.isLoading()).toBe(true)
    expect(loadingContext.defaultState()).toBe("loading")

    dispose()
  })
})

test("demoFlowProviderStateCreate respects URL demoState parameter", () => {
  createRoot((dispose) => {
    const { context } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/events",
      search: () => "?demoState=error",
    })

    expect(context.state()).toBe("error")
    expect(context.isError()).toBe(true)
    expect(context.defaultState()).toBe("loaded")

    dispose()
  })
})

test("demoFlowProviderStateCreate transitions state and resets cleanly", () => {
  createRoot((dispose) => {
    const { context } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/events",
    })

    expect(context.state()).toBe("loaded")

    context.setState("loading")
    expect(context.state()).toBe("loading")
    expect(context.isLoading()).toBe(true)
    expect(context.isLoaded()).toBe(false)

    context.setState("empty")
    expect(context.state()).toBe("empty")
    expect(context.isEmpty()).toBe(true)
    expect(context.isLoading()).toBe(false)

    context.setState("error")
    expect(context.state()).toBe("error")
    expect(context.isError()).toBe(true)
    expect(context.isEmpty()).toBe(false)

    context.reset()
    expect(context.state()).toBe("loaded")
    expect(context.isLoaded()).toBe(true)

    dispose()
  })
})

test("demoFlowProviderStateCreate updates when pathname changes", () => {
  createRoot((dispose) => {
    const [pathname, setPathname] = createSignal("/demo/customer/events")
    const { context } = demoFlowProviderStateCreate({ pathname })

    expect(context.state()).toBe("loaded")
    expect(context.hasFlowStates()).toBe(true)

    context.setState("loading")
    expect(context.state()).toBe("loading")

    // Navigate to canonical empty route
    setPathname("/demo/customer/events-empty")
    expect(context.state()).toBe("empty")
    expect(context.isEmpty()).toBe(true)
    expect(context.defaultState()).toBe("empty")

    // Navigate to non-data-loading route
    setPathname("/demo/contact")
    expect(context.hasFlowStates()).toBe(false)

    dispose()
  })
})
