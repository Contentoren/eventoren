# Demo flows and data states

The demo application is fixture-backed and isolated from production data and mutations. Customer and admin demos are grouped under `/demo/customer/...` and `/demo/admin/...`; legacy demo URLs redirect to the grouped routes. The shared demo flow state supports route-appropriate loaded, loading, empty and error states, with the selected state optionally represented by the `demoState` query parameter. Demo navigation and actions remain within demo routes and do not call production services.
