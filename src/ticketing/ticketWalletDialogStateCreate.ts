export function ticketWalletDialogStateCreate(inputs: {
  walletType: () => "apple" | "google" | string | null | undefined
  onClose: () => void
  ticket: () =>
    | {
        id?: string
        code?: string
        title?: string
        participantName?: string
      }
    | null
    | undefined
  eventTitle: () => string
}) {
  const isOpen = () => inputs.walletType() !== null && inputs.walletType() !== undefined && inputs.walletType() !== ""
  const isApple = () => inputs.walletType() === "apple"
  const isGoogle = () => inputs.walletType() === "google"

  const walletName = () => {
    const type = inputs.walletType()
    if (type === "apple") return "Apple Wallet"
    if (type === "google") return "Google Wallet"
    return "Wallet"
  }

  const dialogTitle = () => `Zu ${walletName()} hinzufügen`
  const ticketCode = () => inputs.ticket()?.code ?? ""
  const participantName = () => inputs.ticket()?.participantName ?? ""
  const ticketTitle = () => inputs.ticket()?.title ?? ""
  const eventTitle = () => inputs.eventTitle() ?? ""
  const handleClose = () => {
    inputs.onClose()
  }

  return {
    isOpen,
    walletName,
    dialogTitle,
    isApple,
    isGoogle,
    ticketCode,
    participantName,
    ticketTitle,
    eventTitle,
    handleClose,
  }
}
