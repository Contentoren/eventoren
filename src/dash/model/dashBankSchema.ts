import * as v from "valibot"

export const dashBankSchema = v.object({
  holder: v.string(),
  iban: v.string(),
})

export type DashBank = v.InferOutput<typeof dashBankSchema>
