export const speculationRules = JSON.stringify({
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          {
            not: {
              or: [
                { href_matches: "/admin" },
                { href_matches: "/admin/*" },
                { href_matches: "/organizer" },
                { href_matches: "/organizer/*" },
                { href_matches: "/scanner/*" },
                { href_matches: "/bestellungen" },
                { href_matches: "/checkout" },
                { href_matches: "/warenkorb" },
                { href_matches: "/sign-in" },
                { href_matches: "/sso" },
                { href_matches: "/logout" },
              ],
            },
          },
        ],
      },
      eagerness: "moderate",
    },
  ],
})
