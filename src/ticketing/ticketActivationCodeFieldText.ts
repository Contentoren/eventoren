/** German microcopy for the public activation-code field. Generic on purpose: no leaks. */
export function ticketActivationCodeFieldText() {
  return {
    labelFor: (productName: string) => `Freischaltungscode für ${productName}`,
    placeholder: "Code",
    requiredHint: "Für dieses Produkt ist ein Freischaltungscode erforderlich.",
    incompleteHint: "8 Zeichen aus Buchstaben und Ziffern.",
    checking: "Code wird geprüft …",
    valid: "Code akzeptiert.",
    invalid: "Dieser Code ist ungültig.",
    retry: "Erneut prüfen",
  }
}
