# Admin navigation and access

The protected `/admin` shell provides separate pages for orders, events, organizers and members. `/admin` redirects to `/admin/bestellungen`. Admin data operations are authorized independently on the backend; the shell or a displayed identity is not an authorization boundary. The organizer overview is based on active organizer grants, while order and event administration use their respective admin-only queries.
