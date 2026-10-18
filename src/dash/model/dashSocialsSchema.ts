import * as v from "valibot"

export const dashSocialsSchema = v.object({
  instagram: v.string(),
  facebook: v.string(),
  tiktok: v.string(),
  youtube: v.string(),
  x: v.string(),
  linkedin: v.string(),
})

export type DashSocials = v.InferOutput<typeof dashSocialsSchema>
