export const speculationRules = JSON.stringify({
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          {
            not: {
              or: [{ href_matches: "/admin" }, { href_matches: "/admin/*" }],
            },
          },
        ],
      },
      eagerness: "moderate",
    },
  ],
})
