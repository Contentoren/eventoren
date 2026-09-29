import { expect } from "@rstest/playwright"

export function browserErrorsAssert(errors: string[]): void {
  expect(errors).toEqual([])
}
