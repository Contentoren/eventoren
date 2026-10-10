# Checkout required-field validation

Checkout validation is owned by the form state; the shared form view renders its results and accessibility attributes. After a submit attempt, every invalid required field is identified and marked independently, and correcting a field clears only that field's error. Before submission, field-level errors are not shown.

Required fields include purchaser first name, last name, email, billing address, postal code, city and country, plus company name for company billing, and a non-empty participant name for every active ticket. Names are trimmed and must contain at least two characters; email and country are checked by their format validators. Phone and tax ID are optional (a provided tax ID is validated). Legal acceptance is a separate checkout gate with its own message and is not a contact/participant validation error. The German required-fields alert is `Fülle alle Pflichtfelder aus`.
