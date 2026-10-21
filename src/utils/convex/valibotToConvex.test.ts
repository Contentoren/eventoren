import { expect, test } from "bun:test"
import { v as cv } from "convex/values"
import * as v from "valibot"
import { valibotFieldToConvexValidator, valibotToConvex } from "./valibotToConvex.ts"

test("picklists derive Convex literal validators from the shared Valibot options", () => {
  const roleSchema = v.picklist(["inhaber", "admin", "eventmanager", "finanzen", "einlass"])
  expect(valibotFieldToConvexValidator(roleSchema)).toEqual(
    cv.union(
      cv.literal("inhaber"),
      cv.literal("admin"),
      cv.literal("eventmanager"),
      cv.literal("finanzen"),
      cv.literal("einlass"),
    ),
  )
})

test("nested strict schemas keep shared literals when deriving table validators", () => {
  const profile = v.strictObject({ status: v.picklist(["pruefung", "aktiv", "gesperrt"]) })
  expect(valibotFieldToConvexValidator(profile)).toEqual(
    cv.object({ status: cv.union(cv.literal("pruefung"), cv.literal("aktiv"), cv.literal("gesperrt")) }),
  )
})

test("optional and single-option picklists retain optionality and literal types", () => {
  const fields = valibotToConvex({ role: v.optional(v.picklist(["inhaber"])), taxRate: v.picklist([700, 1900]) })
  expect(fields.role).toEqual(cv.optional(cv.literal("inhaber")))
  expect(fields.taxRate).toEqual(cv.union(cv.literal(700), cv.literal(1900)))
})
