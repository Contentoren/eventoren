const thankYouMessage =
  "Vielen Dank für deine Buchung! Du erhältst in Kürze eine E-Mail mit allen Informationen und deinem Ticket."

export function eventBookingThankYouBannerStateCreate(inputs: { onDismiss: () => void }) {
  const dismiss = () => {
    inputs.onDismiss()
  }

  return {
    message: () => thankYouMessage,
    dismiss,
  }
}
